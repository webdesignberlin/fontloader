goog.provide('fontloader.UnicodeRange');

goog.require('fontloader.Range');

goog.scope(function () {
  /**
   * @constructor
   * @param {Array.<fontloader.Range>} ranges
   */
  fontloader.UnicodeRange = function (ranges) {
    /**
     * @type {Array.<fontloader.Range>}
     */
    this.ranges = ranges;
  };

  var UnicodeRange = fontloader.UnicodeRange,
      Range = fontloader.Range;

  /**
   * @param {string} input
   * @return {fontloader.UnicodeRange}
   */
  UnicodeRange.parse = function (input) {
    var ranges = input.split(/\s*,\s*/),
        result = [],
        start = null,
        end = null;

    for (var i = 0; i < ranges.length; i++) {
      var match = /^(u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?)$/i.exec(ranges[i]);

      if (match) {
        if (match[2].indexOf('?') !== -1) {
          start = parseInt(match[2].replace('?', '0'), 16);
          end = parseInt(match[2].replace('?', 'f'), 16);
        } else {
          start = parseInt(match[2], 16);

          if (match[3]) {
            end = parseInt(match[3], 16);
          } else {
            end = start;
          }
        }

        result.push(new Range(start, end));
      } else {
        throw new SyntaxError();
      }
    }

    return new UnicodeRange(result);
  };

  /**
   * @param {string} str
   * @return {fontloader.UnicodeRange}
   */
  UnicodeRange.parseString = function (str) {
    var codePoints = [],
        tmp = {};

    for (var i = 0; i < str.length; i++) {
      var charCode = str.charCodeAt(i);

      if ((charCode & 0xF800) === 0xD800 && i < str.length) {
        var nextCharCode = str.charCodeAt(i + 1);
        if ((nextCharCode & 0xFC00) === 0xDC00) {
          tmp[((charCode & 0x3FF) << 10) + (nextCharCode & 0x3FF) + 0x10000] = true;
        } else {
          tmp[charCode] = true;
        }
        i++;
      } else {
        tmp[charCode] = true;
      }
    }

    for (var codePoint in tmp) {
      codePoints.push(parseInt(codePoint, 10));
    }

    codePoints.sort(function (a, b) {
      return a - b;
    });

    return UnicodeRange.parse(codePoints.map(function (codePoint) {
      return 'u+' + codePoint.toString(16);
    }).join(','));
  };

  /**
   * @param {fontloader.UnicodeRange} other
   * @return {boolean} true if this UnicodeRange intersects with another
   */
  UnicodeRange.prototype.intersects = function (other) {
    for (var i = 0; i < this.ranges.length; i++) {
      for (var j = 0; j < other.ranges.length; j++) {
        if (this.ranges[i].intersects(other.ranges[j])) {
          return true;
        }
      }
    }
    return false;
  };

  /**
   * @param {fontloader.UnicodeRange} other
   * @return {boolean}
   */
  UnicodeRange.prototype.equals = function (other) {
    return false;
  };

  /**
   * @private
   * @param {number} codePoint
   * @return {string}
   */
  UnicodeRange.prototype.encodeCodePoint = function (codePoint) {
    if (codePoint <= 0xffff) {
      return String.fromCharCode(codePoint);
    } else {
      return this.encodeCodePoint(Math.floor((codePoint - 0x10000) / 0x400) + 0xd800) +
             this.encodeCodePoint((codePoint - 0x10000) % 0x400 + 0xdc00);
    }
  };

  /**
   * @return {string}
   */
  UnicodeRange.prototype.getTestString = function () {
    var codePoints = [];

    if (this.ranges.length === 1 && this.ranges[0].start === 0x00 && this.ranges[0].end === 0x10ffff) {
      codePoints = [66, 69, 83, 98, 115, 119, 121];
    } else {
      for (var i = 0; i < this.ranges.length && codePoints.length < 7; i++) {
        var range = this.ranges[i];

        for (var j = range.start; j < range.end + 1 && codePoints.length < 7; j++) {
          // Ignore C0 and C1 control codes. This is no guarantee that the first
          // 10 characters in our unicode range are printable (and usable for font
          // load detection) but it is better than nothing.
          if (j > 0x20 && // C0 + space
              (j < 0x80 || j > 0x9f)) { // C1
            codePoints.push(j);
          }
        }
      }
    }

    var result = '';

    for (var l = 0; l < codePoints.length; l++) {
      result += this.encodeCodePoint(codePoints[l]);
    }

    return result;
  };

  /**
   * @return {string}
   */
  UnicodeRange.prototype.toString = function () {
    return this.ranges.join(',');
  };
});
