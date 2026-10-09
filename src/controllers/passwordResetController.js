const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const REQUEST_RECEIVED_MESSAGE =
  'If an account exists with this mobile number, the password reset request has been received. Contact support to verify your identity.';

// POST /api/auth/password-reset-requests { mobile, newPassword, confirmPassword }
const createPasswordResetRequest = asyncHandler(async (req, res) => {
  const { mobile, newPassword, confirmPassword } = req.body;

  if (!mobile || !newPassword || !confirmPassword) {
    return error(res, {
      statusCode: 400,
      message: 'mobile, newPassword and confirmPassword are required',
    });
  }
  if (typeof mobile !== 'string' || !/^[0-9]{10}$/.test(mobile)) {
    return error(res, { statusCode: 400, message: 'Mobile number must be exactly 10 digits' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return error(res, { statusCode: 400, message: 'Password must be at least 6 characters' });
  }
  if (newPassword !== confirmPassword) {
    return error(res, { statusCode: 400, message: 'Passwords do not match' });
  }

  const user = await User.findOne({ mobile }).select('_id');
  if (!user) {
    return success(res, { message: REQUEST_RECEIVED_MESSAGE });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  try {
    await PasswordResetRequest.create({ mobile, passwordHash });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }

  return success(res, { message: REQUEST_RECEIVED_MESSAGE });
});

// GET /api/admin/password-reset-requests?status=pending&page=1&limit=10
const adminListPasswordResetRequests = asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  if (!['pending', 'processing', 'approved', 'rejected'].includes(status)) {
    return error(res, {
      statusCode: 400,
      message: 'status must be pending, processing, approved or rejected',
    });
  }

  const { page, limit, skip } = getPagination(req.query);
  const filter = { status };
  const [requests, total] = await Promise.all([
    PasswordResetRequest.find(filter)
      .select('mobile status reviewedBy reviewedAt createdAt updatedAt')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PasswordResetRequest.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Password reset requests fetched',
    data: requests,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// PATCH /api/admin/password-reset-requests/:id/approve
const adminApprovePasswordResetRequest = asyncHandler(async (req, res) => {
  if (req.body.identityVerified !== true) {
    return error(res, {
      statusCode: 400,
      message: 'Set identityVerified to true after verifying the requester outside the app',
    });
  }

  const request = await PasswordResetRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'processing', reviewedBy: req.admin._id, reviewedAt: new Date() } },
    { new: true },
  ).select('+passwordHash');

  if (!request) {
    return error(res, {
      statusCode: 404,
      message: 'Pending password reset request not found',
    });
  }

  let priorPasswordHash;
  let passwordApplied = false;
  try {
    const user = await User.findOne({ mobile: request.mobile }).select('+password');
    if (!user) {
      await PasswordResetRequest.updateOne(
        { _id: request._id, status: 'processing' },
        { $set: { status: 'rejected' }, $unset: { passwordHash: 1 } },
      );
      return error(res, { statusCode: 404, message: 'User account no longer exists' });
    }

    priorPasswordHash = user.password;
    if (!priorPasswordHash) {
      throw new Error('User password hash was not loaded during password reset approval');
    }

    const passwordUpdate = await User.updateOne(
      { _id: user._id, password: priorPasswordHash },
      { $set: { password: request.passwordHash } },
    );
    if (passwordUpdate.matchedCount === 0) {
      await PasswordResetRequest.updateOne(
        { _id: request._id, status: 'processing' },
        { $set: { status: 'pending' }, $unset: { reviewedBy: 1, reviewedAt: 1 } },
      );
      return error(res, {
        statusCode: 409,
        message: 'User password changed while this request was being reviewed; please retry',
      });
    }
    passwordApplied = true;

    const finalized = await PasswordResetRequest.updateOne(
      { _id: request._id, status: 'processing' },
      { $set: { status: 'approved' }, $unset: { passwordHash: 1 } },
    );
    if (finalized.matchedCount === 0) {
      throw new Error('Password reset request could not be finalized after updating the user password');
    }
  } catch (err) {
    if (passwordApplied) {
      try {
        const rollback = await User.updateOne(
          { mobile: request.mobile, password: request.passwordHash },
          { $set: { password: priorPasswordHash } },
        );
        if (rollback.matchedCount === 1) {
          await PasswordResetRequest.updateOne(
            { _id: request._id, status: 'processing' },
            { $set: { status: 'pending' }, $unset: { reviewedBy: 1, reviewedAt: 1 } },
          );
        } else {
          console.error('Password reset approval failed and the user password could not be safely restored');
        }
      } catch (rollbackError) {
        console.error('Failed to restore password after password reset approval error', rollbackError);
      }
    } else {
      try {
        await PasswordResetRequest.updateOne(
          { _id: request._id, status: 'processing' },
          { $set: { status: 'pending' }, $unset: { reviewedBy: 1, reviewedAt: 1 } },
        );
      } catch (resetError) {
        console.error('Failed to restore password reset request after approval error', resetError);
      }
    }
    throw err;
  }

  return success(res, { message: 'Password reset approved successfully' });
});

// PATCH /api/admin/password-reset-requests/:id/reject
const adminRejectPasswordResetRequest = asyncHandler(async (req, res) => {
  const request = await PasswordResetRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    {
      $set: { status: 'rejected', reviewedBy: req.admin._id, reviewedAt: new Date() },
      $unset: { passwordHash: 1 },
    },
    { new: true },
  ).select('_id');

  if (!request) {
    return error(res, {
      statusCode: 404,
      message: 'Pending password reset request not found',
    });
  }

  return success(res, { message: 'Password reset request rejected' });
});

module.exports = {
  createPasswordResetRequest,
  adminListPasswordResetRequests,
  adminApprovePasswordResetRequest,
  adminRejectPasswordResetRequest,
};
