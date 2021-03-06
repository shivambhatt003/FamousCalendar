define(function(require, exports, module) {
  // import dependencies
  var View = require('famous/core/View');
  var Surface = require('famous/core/Surface');
  var Modifier = require('famous/core/Modifier');
  var Transform = require('famous/core/Transform');
  var RenderNode = require('famous/core/RenderNode');
  var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
  var GridLayout = require("famous/views/GridLayout");
  var Transitionable = require('famous/transitions/Transitionable');
  var ImageSurface = require('famous/surfaces/ImageSurface');
  var MonthView = require('views/MonthView');
  var Easing = require('famous/transitions/Easing');
  var DayView = require('views/DayView');
  var DayScrollView = require('views/DayScrollView');
  var DateConstants = require('config/DateConstants');
  var MonthScrollView = require('views/MonthScrollView');
  var FlexibleLayout = require('famous/views/FlexibleLayout');
  var AddEventView = require('views/AddEventView');
  var HeaderView = require('views/HeaderView');
  var Utility = require('utilities');
  var EventDetailsView = require('views/EventDetailsView');


  function AppView() {
    View.apply(this, arguments);
    this.state = 'monthView';
    this.selectedWeek;
    this.selectedDate;
    this.flag;

    _createLayout.call(this);
    _createHeader.call(this);
    _createHighlightSurface.call(this);
    _createDateStringSurface.call(this);
    _createContent.call(this);
    _setListeners.call(this);
  }

  AppView.DEFAULT_OPTIONS = {
    headerSize: 60
  };

  // root layout
  function _createLayout() {
    this.layout = new HeaderFooterLayout({
      headerSize: this.options.headerSize,
      footerSize: 0
    });

    var layoutModifier = new Modifier({
      transform: Transform.translate(0, 0, 0.1)
    });

    this.add(layoutModifier).add(this.layout);
  }

  function _createHeader() {
    this.headerView = new HeaderView({ appView: this });
    this.headerTransition = new Transitionable([undefined, 60]);
    this.layout.header.add(this.headerTransition).add(this.headerView);
    this._eventInput.subscribe(this.headerView._eventOutput);
  }

  function _createDateStringSurface() {
    this.dateStringSurface = new Surface({
      size:[undefined, 20],
      content: '',
      properties: {
        textAlign: 'center',
        fontFamily: 'sans-serif',
        fontSize: '16px',
        pointerEvents: 'none',
        zIndex: 5
      }
    });

    this.dateStringModifier = new Modifier({
      opacity: 0.001,
      transform: Transform.translate(0, 140, 5)
    });

    this.add(this.dateStringModifier).add(this.dateStringSurface);
  }


  function _createContent() {
    this.monthScrollView = new MonthScrollView({
      highlightModifier: this.highlightModifier
    });

    this.monthMod = new Modifier({
      transform: Transform.translate(0, 0, 1)
    });

    this.dayScrollView = new DayScrollView();
    this.dayScrollModifier = new Modifier({
      transform: Transform.translate(0, 70, 0)
    });

    this.layout.content.add(this.dayScrollModifier).add(this.dayScrollView);
    this.layout.content.add(this.monthMod).add(this.monthScrollView);
    this.monthScrollView.subscribe(this._eventOutput);
    this._eventInput.subscribe(this.monthScrollView._eventOutput);
    this._eventInput.subscribe(this.dayScrollView._eventOutput);
    this.dayScrollView.subscribe(this._eventOutput);
  }

  function _positionHighlighter() {
    var offset = this.monthScrollView.determineOffset();
    var date = this.monthScrollView.selectedWeek.getDate();
    var y = ((date.week) * ((window.innerHeight - 60) / 7)) - (window.innerHeight / 60) - offset + (((window.innerHeight - 60) / 14));
    var x = ((window.innerWidth / 7) * date.weekDay) + (window.innerWidth / 14);
    this.highlightModifier.setAlign([x / (window.innerWidth), y / (window.innerHeight - 60)]);
  }

  function _setHighlighter(data) {
    this.highlightModifier.halt();
    this.highlightModifier.setOpacity(0.01);
    this.highlightSurface.setContent(data.selectedDay);
    _positionHighlighter.call(this);
    this.highlightModifier.setOpacity(0.99);
  }

  function _setListeners() {

    this._eventInput.on('stateChangeMonthView', function(clickData) {
      this.state = 'monthView';
      this.highlightModifier.setOpacity(0.01);
      _setTitleSurface.call(this, this.monthScrollView.year);
      _toggleHeaderSize.call(this);
      this._eventOutput.emit('back', clickData);
    }.bind(this));

    this._eventInput.on('stateChangeDayView', function(weekView) {
      this.state = 'dayView';
      this.selectedWeek = weekView;
      this.selectedDate = weekView.getDate();
      this.dayScrollView.setToDate(_generateDateString(weekView),
        weekView.weekDay, false);
      _setHighlighter.call(this, weekView);
      _setTitleSurface.call(this, DateConstants.monthNames[weekView.getDate().month]);
      _toggleHeaderSize.call(this, weekView);
    }.bind(this));

    this._eventInput.on('toggleSelectedDate', function(weekView) {
      var currentMonth = this.selectedDate && this.selectedDate.month;
      this.selectedDate = weekView.getDate();

      // when user scrolls the day view to another month and then clicks back on a day in the original month
      if (currentMonth !== this.selectedDate.month) {
        _setTitleSurface.call(this, DateConstants.monthNames[this.selectedDate.month]);
      }

      this.dayScrollView.setToDate(_generateDateString(weekView), weekView.weekDay, true);
      _setHighlighter.call(this, weekView);
      _transitionDateString.call(this, this.selectedDate);
    }.bind(this));

    this._eventInput.on('updateYear', function(year) {
      _setTitleSurface.call(this, year);
    }.bind(this));

    this._eventInput.on('showDetails', function(eventView) {
      // temporary hack for eventView/dayView event handling bug
      if (this.flag) return;
      this.flag = true;
      setTimeout(function() {
        this.flag = false;
      }.bind(this), 1500);

      var eventDetailsModifier = new Modifier({
        transform: Transform.translate(0,0,15),
        origin: [0.5, 0.5],
        align: [0.5, 0.5],
      });

      var detailsView = new EventDetailsView(eventView.event);

      this.add(eventDetailsModifier).add(detailsView);
      detailsView._eventOutput.pipe(this._eventInput);
    }.bind(this));

    this._eventInput.on('addEventView', function(clickData) {
      var addEventView = new AddEventView();
      var addEventViewModifier = new Modifier({
        transform: Transform.translate(0,0,15),
        origin: [0.5, 0.5],
        align: [0.5, 0.5],

      });
      this.add(addEventViewModifier).add(addEventView);
      addEventView._eventOutput.pipe(this._eventInput);
    }.bind(this));

    this._eventInput.on('nodeChange', function(direction, date) {
      var dateString;
      var monthBefore = this.selectedDate.month;
      if (direction < 0) {
        this.selectedDate = DateConstants.getPreviousDate(this.selectedDate);
      } else {
        this.selectedDate = DateConstants.getNextDate(this.selectedDate);
      }

      // when the user scrolls the dayView outside or back into the current month
      if (this.selectedDate.month !== monthBefore) {
        _setTitleSurface.call(this, DateConstants.monthNames[this.selectedDate.month]);
      }

      this.selectedWeek.selectedDay = this.selectedDate.day;
      this.selectedWeek.options.weekDay += direction;

      _setHighlighter.call(this, this.selectedWeek);
      _transitionDateString.call(this, this.selectedDate);
    }.bind(this));

    this._eventInput.on('changes', function() {
      this.dayScrollView.resetDay();
      _checkForEvents.call(this);
    }.bind(this));
  }

  // transition for updating content in back/title surface, called whenever there is a change in state
  function _setTitleSurface(title) {
    this.headerView.titleModifier.halt();
    this.headerView.titleModifier.setOpacity(0.001, { duration: 200, curve: 'easeIn' }, function() {
      this.headerView.titleSurface.setContent(title);
      this.headerView.titleModifier.setOpacity(0.999, { duration: 200, curve: 'easeIn' });
    }.bind(this));
  }

  // header bar transition
  function _toggleHeaderSize() {
    var date;
    var height = (this.state === 'dayView') ? 130 : 60;

    this.headerTransition.halt();
    this.headerView.backgroundModifier.halt();
    this.dateStringModifier.halt();
    this.headerTransition.set([undefined, height], {duration: 700, curve: Easing.outQuint});
    this.headerView.backgroundModifier.sizeFrom(this.headerTransition);

    if (height === 130) {
      date = this.monthScrollView.selectedDate;
      this.dateStringSurface.setContent(DateConstants.daysOfWeek[date.weekDay] + 
        ' ' + DateConstants.monthNames[date.month] + ' ' + date.day + ', ' + date.year);
      this.dateStringModifier.setTransform(Transform.translate(0, 100, 5), { duration: 650, curve: Easing.outExpo });
      this.dateStringModifier.setOpacity(0.999, {duration: 325, curve: Easing.inQuart});
    } else {
      this.dateStringModifier.setOpacity(0.001, {duration: 150, curve: Easing.outExpo});
      this.dateStringModifier.setTransform(Transform.translate(0, 140, 5), { duration: 550, curve: Easing.outExpo });
    }
  }

  // transitions displayed date string in header when going between selected dates 
  function _transitionDateString(dateObj) {
    var dateString = DateConstants.toFormattedDateString(dateObj.year, dateObj.month, dateObj.day, dateObj.weekDay);
    this.dateStringModifier.halt();
    this.dateStringModifier.setOpacity(0.001);
    this.dateStringSurface.setContent(dateString);

    if (true) {
      this.dateStringModifier.setTransform(Transform.translate(-40, 100, 5));
      this.dateStringModifier.setOpacity(0.999, {duration: 600, curve: Easing.outCubic});
      this.dateStringModifier.setTransform(Transform.translate(0, 100, 5), { duration: 700, curve: Easing.outQuart });
    } else {
      this.dateStringModifier.setTransform(Transform.translate(40, 100, 5));
      this.dateStringModifier.setOpacity(0.999, {duration: 600, curve: Easing.outCubic});
      this.dateStringModifier.setTransform(Transform.translate(0, 100, 5), { duration: 700, curve: Easing.outQuart });
    }
  }

  function _createHighlightSurface() {
    this.highlightSurface = new Surface({
      size: [34, 34],
      content: '',
      properties: {
        color: 'white',
        textAlign: 'center',
        lineHeight: '34px',
        fontWeight: 'bold',
        fontSize: '18px',
        fontFamily: 'sans-serif',
        backgroundColor: 'black',
        borderRadius: '50px',
        zIndex: 6,
        pointerEvents: 'none'
      }
    });

    this.highlightModifier = new Modifier({
      align: [0, 0],
      origin: [0.5, 0.5],
      opacity: 0.01,
      transform: Transform.translate(0, 0, 6)
    });

    this.layout.content.add(this.highlightModifier).add(this.highlightSurface);
  };

  function _generateDateString(weekView) {
    return DateConstants.generateDateString(weekView.options.year,
      weekView.options.month + 1, weekView.selectedDay);
  }

  function _checkForEvents() {
    for (var i = 0; i < this.monthScrollView.months.length; i++) {
      this.monthScrollView.months[i].refreshEvents();
    }
  }

  AppView.prototype = Object.create(View.prototype);
  AppView.prototype.constructor = AppView;

  module.exports = AppView;
});