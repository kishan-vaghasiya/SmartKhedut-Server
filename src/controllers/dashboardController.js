const User = require('../models/User');
const TradePost = require('../models/TradePost');
const MarketAd = require('../models/MarketAd');
const Scheme = require('../models/Scheme');
const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');

// GET /api/admin/dashboard/stats  (admin)
const getStats = asyncHandler(async (req, res) => {
  const [totalUsers, activeUsers, tradeListings, marketListings, schemes, pendingTrade, pendingMarket] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      TradePost.countDocuments(),
      MarketAd.countDocuments(),
      Scheme.countDocuments(),
      TradePost.countDocuments({ status: 'pending' }),
      MarketAd.countDocuments({ status: 'pending' }),
    ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const growth = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        users: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return success(res, {
    message: 'Dashboard stats fetched',
    data: {
      totalUsers,
      activeUsers,
      tradeListings,
      marketListings,
      schemes,
      pendingApprovals: pendingTrade + pendingMarket,
      listingSplit: [
        { name: 'Trade', value: tradeListings },
        { name: 'Market', value: marketListings },
        { name: 'Schemes', value: schemes },
      ],
      userGrowth: growth.map((g) => ({ month: `${g._id.month}/${g._id.year}`, users: g.users })),
    },
  });
});

module.exports = { getStats };
