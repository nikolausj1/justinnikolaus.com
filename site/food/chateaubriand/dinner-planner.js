const dinnerPlanner = document.querySelector('#dinner-planner');
const dinnerTime = document.querySelector('#dinner-time');
const dinnerStatus = document.querySelector('#dinner-status');
const timelineTimes = document.querySelectorAll('.timeline [data-minutes-before]');
const clock = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

if (dinnerTime.type === 'time') {
  dinnerPlanner.addEventListener('submit', (event) => {
    event.preventDefault();

    // The input represents a wall-clock time measured from midnight.
    const dinner = dinnerTime.valueAsNumber;
    if (!Number.isFinite(dinner)) return;

    for (const label of timelineTimes) {
      const start = dinner - Number(label.dataset.minutesBefore) * 60_000;
      const day = start < 0 ? ' (previous day)' : '';
      label.textContent = `${clock.format(start)}${day}`;
    }

    dinnerStatus.textContent = `Estimated start times for dinner at ${clock.format(dinner)}.`;
  });

  dinnerPlanner.hidden = false;
}
