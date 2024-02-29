function diffInMinutes(endDate, startDate) {
  let diff = (endDate.getTime() - startDate.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

function toTimeString(date) {
  return date.toLocaleTimeString('en-GB', {timeZone: 'UTC', timeZoneName: 'short'});
}

module.exports.diffInMinutes = diffInMinutes;
module.exports.toTimeString = toTimeString;
