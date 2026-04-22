// 数据导出服务 - Excel导出
const ExcelJS = require('exceljs');
const fs = require('fs');

// 导出报名名单为Excel
async function exportRegistrations(activity, registrations) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '畅行活动报名系统';
  workbook.created = new Date();
  
  // 工作表1: 报名名单
  const sheet = workbook.addWorksheet('报名名单');
  
  // 设置列宽
  sheet.columns = [
    { header: '序号', key: 'index', width: 8 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '手机号', key: 'phone', width: 15 },
    { header: '报名状态', key: 'status', width: 12 },
    { header: '支付状态', key: 'paymentStatus', width: 12 },
    { header: '报名时间', key: 'createdAt', width: 20 },
    { header: '签到状态', key: 'checkinStatus', width: 12 },
    { header: '签到时间', key: 'checkinTime', width: 20 }
  ];
  
  // 标题行样式
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '8AB4F8' }
  };
  sheet.getRow(1).alignment = { horizontal: 'center' };
  
  // 添加数据
  registrations.forEach((reg, index) => {
    const fields = reg.fields || {};
    sheet.addRow({
      index: index + 1,
      name: fields.name || '-',
      phone: fields.phone || reg.user?.phone || '-',
      status: getStatusText(reg.status),
      paymentStatus: getPaymentText(reg.paymentStatus),
      createdAt: formatDate(reg.createdAt),
      checkinStatus: reg.checkinTime ? '已签到' : '未签到',
      checkinTime: reg.checkinTime ? formatDate(reg.checkinTime) : '-'
    });
  });
  
  // 数据行样式
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { horizontal: 'center' };
      row.border = {
        top: { style: 'thin', color: { argb: '353842' } },
        bottom: { style: 'thin', color: { argb: '353842' } },
        left: { style: 'thin', color: { argb: '353842' } },
        right: { style: 'thin', color: { argb: '353842' } }
      };
    }
  });
  
  // 工作表2: 活动信息
  const infoSheet = workbook.addWorksheet('活动信息');
  infoSheet.columns = [
    { header: '项目', key: 'key', width: 20 },
    { header: '内容', key: 'value', width: 40 }
  ];
  
  infoSheet.addRow({ key: '活动名称', value: activity.title });
  infoSheet.addRow({ key: '活动时间', value: `${activity.startTime} - ${activity.endTime}` });
  infoSheet.addRow({ key: '活动地点', value: activity.location });
  infoSheet.addRow({ key: '总名额', value: activity.totalSpots });
  infoSheet.addRow({ key: '剩余名额', value: activity.spotsLeft });
  infoSheet.addRow({ key: '报名人数', value: activity.registrationCount });
  infoSheet.addRow({ key: '报名费用', value: activity.price === 0 ? '免费' : `¥${activity.price}` });
  infoSheet.addRow({ key: '创建时间', value: formatDate(activity.createdAt) });
  
  // 样式
  infoSheet.getRow(1).font = { bold: true };
  infoSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'C58AF9' }
  };
  
  return await workbook.xlsx.writeBuffer();
}

// 导出统计报表
async function exportStatistics(activities, stats) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '畅行活动报名系统';
  workbook.created = new Date();
  
  // 工作表1: 概览
  const overviewSheet = workbook.addWorksheet('数据概览');
  overviewSheet.columns = [
    { header: '指标', key: 'key', width: 25 },
    { header: '数值', key: 'value', width: 15 }
  ];
  
  overviewSheet.addRow({ key: '活动总数', value: stats.totalActivities });
  overviewSheet.addRow({ key: '已发布活动', value: stats.publishedCount });
  overviewSheet.addRow({ key: '报名总数', value: stats.totalRegistrations });
  overviewSheet.addRow({ key: '待审核', value: stats.pendingApproval });
  
  overviewSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  overviewSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '81C995' }
  };
  
  // 工作表2: 活动列表
  const activitySheet = workbook.addWorksheet('活动列表');
  activitySheet.columns = [
    { header: '活动名称', key: 'title', width: 30 },
    { header: '分类', key: 'category', width: 12 },
    { header: '状态', key: 'status', width: 10 },
    { header: '总名额', key: 'totalSpots', width: 10 },
    { header: '已报名', key: 'registrationCount', width: 10 },
    { header: '浏览量', key: 'viewCount', width: 10 },
    { header: '费用', key: 'price', width: 10 }
  ];
  
  activitySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  activitySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '8AB4F8' }
  };
  
  activities.forEach(act => {
    activitySheet.addRow({
      title: act.title,
      category: act.category,
      status: act.status,
      totalSpots: act.totalSpots,
      registrationCount: act.registrationCount,
      viewCount: act.viewCount,
      price: act.price === 0 ? '免费' : `¥${act.price}`
    });
  });
  
  return await workbook.xlsx.writeBuffer();
}

// 辅助函数
function getStatusText(status) {
  const map = {
    'pending': '待审核',
    'confirmed': '已确认',
    'cancelled': '已取消',
    'checked-in': '已签到',
    'expired': '已过期'
  };
  return map[status] || status;
}

function getPaymentText(status) {
  const map = {
    'unpaid': '待支付',
    'paid': '已支付',
    'refunded': '已退款'
  };
  return map[status] || status;
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN');
}

module.exports = {
  exportRegistrations,
  exportStatistics
};
