/*** TimeUtil.js ***
 *  Wayland Woodruff
 *  WaylandWoodruff@gmail.com
 */

define(function(require, exports, module) {
  var AppSettings = require('config/AppSettings');
  
  /**@enum**/
  var DATE = {
    YEAR: 0,
    MONTH: 1,
    DAY: 2
  };
  
  /**@enum**/
  var TIME = {
    HOUR: 0,
    MIN: 1
  };

  var timeUtil = {};
  
  /** @method dateStrToArr
   * 
   * Converts a date in the form of a string to an array.
   *
   * @param {string} dateStr : A date supplied in string format "yyyy-mm-dd"
   * @return {array} A three-index array [year, month, day]
   */
  timeUtil.dateStrToArr = function _dateStrToArr(dateStr) {
    if (dateStr instanceof Array) return dateStr;
    if (!dateStr || dateStr.length !== 10) return;
    
    var result = [];
    result.push(+(dateStr.slice(0, 4)));  //  Year
    result.push(+(dateStr.slice(5, 7)));  //  Month
    result.push(+(dateStr.slice(8)));     //  Day
    return result;
  } //  End _dateStrToArr
  
  /**@method dateArrToStr
   * 
   * Converts a date in the form of an array into a hyphen-delimited string.
   * TODO: Improve algorithm to convert year (make cleaner) and handle any year (including negative)
   *
   * @param {array} dateArr : A 3-index array in this order: [year, month, day]
   * @return {string} A hyphen-delimited date in form of "yyyy-mm-dd"
   */
  timeUtil.dateArrToStr = function _dateArrToStr(dateArr) {
    if (!dateArr || !(dateArr instanceof Array) || (dateArr.length < 3)) return;
    
    var result = '';
    if (dateArr[DATE.YEAR] > 999) result += dateArr[DATE.YEAR] + '-';
    else if (dateArr[DATE.YEAR] > 99) result += '0' + dateArr[DATE.YEAR] + '-';
    else if (dateArr[DATE.YEAR] > 9) result += '00' + dateArr[DATE.YEAR] + '-';
    else if (dateArr[DATE.YEAR] > -1) result += '000' + dateArr[DATE.YEAR] + '-';
    else result += '0000' + '-';
    
    result += (dateArr[DATE.MONTH] > 9) ? dateArr[DATE.MONTH] + '-' : '0' + dateArr[DATE.MONTH] + '-';
    result += (dateArr[DATE.DAY] > 9) ? dateArr[DATE.DAY] : '0' + dateArr[DATE.DAY];
    return result;
  } //  End _dateArrToStr
  
  /**@method findOffsetDate
   * 
   * Determines the date a specified number of days apart from a specified date.
   * TODO: Simplify this function; not DRY enough
   *
   * @param {array} date : A three-index date storing [year, month, day]. This is
   *                       the date from which the returned date will be determined.
   * @param {number} offset : An integer value specifying how many days to diverge
   *                          from the specified date. A negative value counts days
   *                          prior to the specified date, a positive value counts
   *                          subsequent days.
   * @return {array} A three-index date in format [year, month, day] of the date that
   *                 is 'offset' number of days apart from 'date'
   */
  timeUtil.findOffsetDate = function _findOffsetDate(date, offset) {
    if (!date) return null;
    
    var _31DayMonths = 5546;  //  ...0 0001 0101 1010 1010
    var offsetDate = [date[DATE.YEAR], date[DATE.MONTH], (date[DATE.DAY] + offset)];
    
    function nextMonth() {
      var date = offsetDate.slice();
      date[DATE.MONTH] = ((date[DATE.MONTH] + 1) < 13) ? (date[DATE.MONTH] + 1) : 1;
      if (date[DATE.MONTH] === 1) date[DATE.YEAR] += 1;
      date[DATE.DAY] = 1;
      
      return date;
    }
    
    function prevMonth() {
      var date = offsetDate.slice();
      date[DATE.MONTH] = ((date[DATE.MONTH] - 1) > 0) ? (date[DATE.MONTH] - 1) : 12;
      if (date[DATE.MONTH] === 12) date[DATE.YEAR] -= 1;
      
      if ((1 << date[DATE.MONTH]) & _31DayMonths) date[DATE.DAY] = 31;
      else if (date[DATE.MONTH] === 2) date[DATE.DAY] = (_isLeapYear(date[DATE.YEAR])) ? 29 : 28;
      else date[DATE.DAY] = 30;
      
      return date;
    }
    
    if ((1 << date[DATE.MONTH]) & _31DayMonths) {
      if (offsetDate[DATE.DAY] < 1) {
        return _findOffsetDate(prevMonth(), offsetDate[DATE.DAY]);
      } else if (offsetDate[DATE.DAY] > 31) {
        return _findOffsetDate(nextMonth(), (offsetDate[DATE.DAY] - 32));
      } else {
        return offsetDate;
      }
    } else if (date[DATE.MONTH] === 2) {
      if (offsetDate[DATE.DAY] < 1) {
        return _findOffsetDate(prevMonth(), offsetDate[DATE.DAY]);
      } else {
        var maxDay = (_isLeapYear(offsetDate[DATE.YEAR])) ? 29 : 28;
        if (offsetDate[DATE.DAY] > maxDay) return _findOffsetDate(nextMonth(), (offsetDate[DATE.DAY] - maxDay - 1));
        else return offsetDate;
      }
    } else {
      if (offsetDate[DATE.DAY] < 1) {
        return _findOffsetDate(prevMonth(), offsetDate[DATE.DAY]);
      } else if (offsetDate[DATE.DAY] > 30) {
        return _findOffsetDate(nextMonth(), (offsetDate[DATE.DAY] - 31));
      } else {
        return offsetDate;
      }
    }
  } //  End _findOffsetDate
  
  /**@method isLeapYear
   * 
   * Determines if a year supplied is a leap year or not
   *
   * @param {number} year : A year to test.
   * @return {boolean} true if the argument is a leap year, false if not.
   */
  timeUtil.isLeapYear = function _isLeapYear(year) {
    if (typeof year === 'string') year = +year;
    return ((year % 400 === 0) || ((year % 100 !== 0) && (year % 4 === 0)));
  }
  
  /**@method timeDiffDays
   * 
   * Calculates the number of days between two dates exclusive of the dates supplied
   * (calculates only whole, undivided days between the specified dates).
   * TODO: Clean end of function; not DRY enough
   *
   * @param {array} target : A three-index array in format [year, month, day] of
   *                         the date offset from the current date.
   * @param {array} current : A three-index array in format [year, month, day] of
   *                          the current date.
   * @return {number} Integer value of the number of whole, undivided days between
   *                  the target and current days (exclusive). A negative value
   *                  indicates the target date is before the current date, a positive
   *                  value indicates target date falls after current date.
   */
  timeUtil.timeDiffDays = function _timeDiffDays(target, current) {
    var _31DayMonths = 5546;
    
    function daysFromBeginMonth(date) {
      return date[DATE.DAY] - 1;
    }
    
    function daysFromEndMonth(date) {
      if ((1 << date[DATE.MONTH]) && _31DayMonths) return 31 - date[DATE.DAY];
      else if (date[DATE.MONTH] === 2) return (TimeUtil.isLeapYear(date[DATE.YEAR])) ? 29 - date[DATE.DAY] : 28 - date[DATE.DAY];
      else return 30 - date[DATE.DAY];
    }
    
    function daysBetweenMonths(earlyMonth, laterMonth) {
      var days = 0;
      
      for (var m = earlyMonth; m <= laterMonth; m++) {
        if ((1 << m) && _31DayMonths) days += 31;
        else if (m === 2) days += (_isLeapYear(date[DATE.YEAR])) ? 29 : 28;
        else days += 30;
      }
      return days;
    }
    
    function daysFromBeginYear(date) {
      var days = 0;
      for (var m = 1; m < date[DATE.MONTH]; m++) {
        if ((1 << m) && _31DayMonths) days += 31;
        else if (m === 2) days += (_isLeapYear(date[DATE.YEAR])) ? 29 : 28;
        else days += 30;
      }
      days += daysFromBeginMonth(date);
      return days;
    }
    
    function daysFromEndYear(date) {
      var days = 0;
      for (var m = 12; m > date[DATE.MONTH]; m--) {
        if ((1 << m) && _31DayMonths) days += 31;
        else if (m === 2) days += (_isLeapYear(date[DATE.YEAR])) ? 29 : 28;
        else days += 30;
      }
      days += daysFromEndMonth(date);
      return days;
    }
    
    function daysBetweenYears(earlyYear, laterYear) {
      var days = 0;
      for (var y = earlyYear; y <= laterYear; y++) {
        days += (_isLeapYear(y)) ? 366 : 365;
      }
      return days;
    }
    
    var days = 0;
    if (target[0] === current[0]) {     //  Same year
      if (target[1] === current[1]) {   //  Same month
        days = target[DATE.DAY] - current[DATE.DAY];
        if (days === 0) return 0;
        else if (days > 0) return days - 1;
        else return days + 1;
      } else if (target[1] > current[1]) {  //  target month after current month
        days = daysBetweenMonths((current[1] + 1), (target[1] - 1));
        days += daysFromBeginMonth(target);
        days += daysFromEndMonth(current);
        return days;
      } else {      //  target month before current month
        days = daysBetweenMonths((target[1] + 1), (current[1] - 1));
        days += daysFromEndMonth(target);
        days += daysFromBeginMonth(current);
        return -days;
      }
    } else if (target[0] > current[0]) {  //  target year after current year
      days = daysBetweenYears((current[0] + 1), (target[0] - 1));
      days += daysFromBeginYear(target);
      days += daysFromEndYear(current);
      return days;
    } else {          //  target year before current year
      days = daysBetweenYears((target[0] + 1), (current[0] - 1));
      days += daysFromEndYear(target);
      days += daysFromBeginYear(current);
      return -days;
    }
  } //  End _timeDiffDays
  
  module.exports = timeUtil;
  
});





































