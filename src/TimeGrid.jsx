import React from 'react';
import cn from 'classnames';
import { findDOMNode } from 'react-dom';
import dates from './utils/dates';
import localizer from './localizer'

import DaySlot from './DaySlot';
import EventRow from './EventRow';
import TimeGutter from './TimeGutter';
import BackgroundCells from './BackgroundCells';
import TimeIndicator from './TimeIndicator';

import classes from 'dom-helpers/class';
import getWidth from 'dom-helpers/query/width';
import scrollbarSize from 'dom-helpers/util/scrollbarSize';
import message from './utils/messages';

import { dateFormat} from './utils/propTypes';

import { notify } from './utils/helpers';
import { navigate } from './utils/constants';
import { accessor as get } from './utils/accessors';

import { inRange, eventSegments, eventLevels, sortEvents, segStyle } from './utils/eventLevels';

const MIN_ROWS = 2;

let TimeGrid = React.createClass({

  propTypes: {
    ...DaySlot.propTypes,
    ...TimeGutter.propTypes,

    step: React.PropTypes.number,
    min: React.PropTypes.instanceOf(Date),
    max: React.PropTypes.instanceOf(Date),
    dayFormat: dateFormat,
    rtl: React.PropTypes.bool
  },

  getDefaultProps(){
    return {
      step: 30,
      min: dates.startOf(new Date(), 'day'),
      max: dates.endOf(new Date(), 'day'),
      nowIndicator: false
    }
  },

  componentWillMount() {
    this._gutters = [];
  },

  componentDidMount() {
    this._adjustGutter()
  },

  componentDidUpdate() {
    this._adjustGutter()
  },

  render() {
    let {
        events, start, end, messages
      , startAccessor, endAccessor, allDayAccessor
      , showAllDayRow, min, max } = this.props;

    let addGutterRef = i => ref => this._gutters[i] = ref;

    let range = dates.range(start, end, 'day')

    this._slots = range.length;

    let allDayEvents = []
      , rangeEvents = [];

    events.forEach(event => {
      if (inRange(event, start, end, this.props)) {
        let eStart = get(event, startAccessor)
          , eEnd = get(event, endAccessor);

        if(!showAllDayRow && get(event, allDayAccessor)) {
            return;
        }

        if ( showAllDayRow &&  ( 
                get(event, allDayAccessor)
                || !dates.eq(eStart, eEnd, 'day')
                || (dates.isJustDate(eStart) && dates.isJustDate(eEnd))
            ))
        {
          allDayEvents.push(event)
        }
        else
          rangeEvents.push(event)
      }
    })

    allDayEvents.sort((a, b) => sortEvents(a, b, this.props))

    let segments = allDayEvents.map(evt => eventSegments(evt, start, end, this.props))
    let { levels } = eventLevels(segments)

    const today = new Date();
    let gutterDate = dates.inRange(today, start, end, 'day') ? today : start;
    let gutterMin = dates.merge(gutterDate, min);
    let gutterMax = dates.merge(gutterDate, max);
    
    const allDayRow = showAllDayRow ?
             <div className='rbc-row'>
               <div ref={addGutterRef(1)} className='rbc-gutter-cell'>
                 { message(messages).allDay }
               </div>
               <div ref='allDay' className='rbc-allday-cell'>
                 <BackgroundCells
                   slots={range.length}
                   container={()=> this.refs.allDay}
                   selectable={this.props.selectable}
                 />
                 <div style={{ zIndex: 1, position: 'relative' }}>
                   { this.renderAllDayEvents(range, levels) }
                 </div>
               </div>
             </div> : null;

       return (
         <div className='rbc-time-view'>
           <div ref='headerCell' className='rbc-time-header'>
             <div className='rbc-row'>
               <div ref={addGutterRef(0)} className='rbc-gutter-cell'/>
               { this.renderHeader(range) }
             </div>
             {allDayRow}
           </div>
           <div ref='content' className='rbc-time-content'>
          <TimeGutter ref='gutter' {...this.props}>
            { this.renderNowIndicator(gutterMin, gutterMax) }
          </TimeGutter>
             {
               this.renderEvents(range, rangeEvents, segments)
             }
           </div>
         </div>
       );
  },

  renderEvents(range, events){
    let { min, max, endAccessor, startAccessor, components } = this.props;
    let today = new Date();

    return range.map((date, idx) => {
      let daysEvents = events.filter(
        event => dates.inRange(date,
          get(event, startAccessor),
          get(event, endAccessor), 'day')
      )

      const dateMin = dates.merge(date, min);
      const dateMax = dates.merge(date, max);

      return (
        <DaySlot
          {...this.props }
          min={dateMin}
          max={dateMax}
          eventComponent={components.event}
          className={cn({ 'rbc-now': dates.eq(date, today, 'day') })}
          style={segStyle(1, this._slots)}
          key={idx}
          date={date}
          events={daysEvents}
        >
          {this.renderNowIndicator(dateMin, dateMax)}
        </DaySlot>
      )
    })
  },

  renderAllDayEvents(range, levels){
    let first = range[0]
      , last = range[range.length - 1];

    while (levels.length < MIN_ROWS )
      levels.push([])

    return levels.map((segs, idx) =>
      <EventRow
        eventComponent={this.props.components.event}
        titleAccessor={this.props.titleAccessor}
        startAccessor={this.props.startAccessor}
        endAccessor={this.props.endAccessor}
        allDayAccessor={this.props.allDayAccessor}
        onSelect={this._selectEvent}
        slots={this._slots}
        key={idx}
        segments={segs}
        start={first}
        end={last}
      />
    )
  },

  renderHeader(range){
    let { dayFormat, culture } = this.props;
    let now = new Date();

    return range.map((date, i) =>
      <div key={i}
        className={cn('rbc-header', {          
          'rbc-now': dates.eq(date, now, 'day')
        })}
        style={segStyle(1, this._slots)}
      >
        <a href='#' onClick={this._headerClick.bind(null, date)}>
          { localizer.format(date, dayFormat, culture) }
        </a>
      </div>
    )
  },

  renderNowIndicator(min, max) {
    const { nowIndicator } = this.props;
    const now = new Date();

    if (nowIndicator && dates.inRange(now, min, max, 'minutes')) {
      return <TimeIndicator time={now} min={min} max={max} />
    }
  },

  _headerClick(date, e){
    e.preventDefault()
    notify(this.props.onNavigate, [navigate.DATE, date])
  },

  _selectEvent(...args){
    notify(this.props.onSelectEvent, args)
  },

  _adjustGutter() {
    let isRtl = this.props.rtl;
    let header = this.refs.headerCell;
    let width = this._gutterWidth
    let gutterCells = [findDOMNode(this.refs.gutter), ...this._gutters]
    let isOverflowing = this.refs.content.scrollHeight > this.refs.content.clientHeight;

    if (!width) {
      this._gutterWidth = Math.max(...gutterCells.map(getWidth));

      if (this._gutterWidth) {
        width = this._gutterWidth + 'px';
        gutterCells.forEach(node => node.style.width = width)
      }
    }

    if (isOverflowing) {
      classes.addClass(header, 'rbc-header-overflowing')
      this.refs.headerCell.style[!isRtl ? 'marginLeft' : 'marginRight'] = '';
      this.refs.headerCell.style[isRtl ? 'marginLeft' : 'marginRight'] = scrollbarSize() + 'px';
    }
    else {
      classes.removeClass(header, 'rbc-header-overflowing')
    }
  }

});


export default TimeGrid
