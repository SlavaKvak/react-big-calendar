import React from 'react';
import cn from 'classnames';
import dates from './utils/dates';

const TimeIndicator = React.createClass({
  propTypes: {
    time: React.PropTypes.instanceOf(Date).isRequired,
    min: React.PropTypes.instanceOf(Date).isRequired,
    max: React.PropTypes.instanceOf(Date).isRequired
  },

  render() {
    const { time, min, max } = this.props;
    const totalMinutes = dates.diff(min, max, 'minutes');
    const timeMinutes = dates.diff(min, dates.merge(min, time), 'minutes');
    const timeTop = ((timeMinutes / totalMinutes) * 100);

    return (<div className='rbc-time-indicator' style={{ top: timeTop + '%' }}></div>);
  }
});

export default TimeIndicator;
