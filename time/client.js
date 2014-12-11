function date_from_time_el(el) {
	if (!el)
		return new Date();
	var dTime = el.getAttribute('datetime');
	// Don't crash the function, if scanning an unsynced post in progress
	if (!dTime)
		return new Date();
	var d = dTime.replace(/-/g, '/'
		).replace('T', ' ').replace('Z', ' GMT');
	return new Date(d);
}

(function () {

var readable_time = oneeSama.readable_time;

function adjust_all_times() {
	$('time').each(function () {
		var date = date_from_time_el(this);
		this.innerHTML = readable_time(date.getTime());
	});
}

var is_skewed = (function(){
	var el = document.querySelector('time');
	if (!el)
		return false;
	var d = date_from_time_el(el);
	return readable_time(d.getTime()) != el.innerHTML;
})();

// TODO:0.5: Run after post extracion
if (is_skewed) {
	if (!oneeSama.rTime)
		adjust_all_times();

	setTimeout(function () {
		// next request, have the server render the right times
		var tz = -new Date().getTimezoneOffset() / 60;
		$.cookie('timezone', tz, {expires: 90, path: '/'});
	}, 3000);
}
})();

// Get a more accurate server-client time offset, for interclient syncing
// Does not account for latency, but good enough for our purposes
var serverTimeOffset;
dispatcher[GET_TIME] = function(msg){
	if (msg[0]){
		var clientTime = new Date().getTime();
		serverTimeOffset = clientTime - msg[0];
	}
};

/* syncwatch */

function timer_from_el($el) {
	if (!serverTimeOffset)
		return;
	$el.addClass('timerTicking');
	var start= $el.attr('start')-serverTimeOffset;
	var end = $el.attr('end')-serverTimeOffset;
	var maxh = pad($el.attr('hour'));
	var maxm = pad($el.attr('min'));
	var maxs = pad($el.attr('sec'));

	(function moumouikkai(){
		var now = new Date().getTime()-serverTimeOffset;
		if (now > end)
			return $el.text('Finished');
		// If the start time is in the future
		if (start > now) {
			var countdown = Math.round((start-now)/1000);
			if(countdown==10 || countdown==5)
				Backbone.trigger('syncCountdown',countdown);
			$el.text('Countdown: ' + countdown);
			return setTimeout(moumouikkai, 1000);
		}
		var diff=now-start;
		var hour = Math.floor(diff/1000/60/60);
		diff-= hour*1000*60*60;
		var min= Math.floor(diff/1000/60);
		diff-= min*1000*60;
		var sec=Math.floor(diff/1000);
		$el.text("Now at: "+pad(hour)+":"+pad(min)+":"+pad(sec)+" / "+maxh+":"+maxm+":"+maxs);
		return setTimeout(moumouikkai, 1000);
	})();
}

// Read from option initially
if (options.get('syncWatch'))
	mouikkai();
var mouikkaier;
// Change on option change
options.on('change:syncWatch', function(e, v){
	if (v)
		mouikkai();
	else
		clearTimeout(mouikkaier);
});

function mouikkai(){
	mouikkaier= setTimeout(function(){
		$('syncwatch').not('.timerTicking').each(function(){
			timer_from_el($(this));
		});
		mouikkai();
	} ,1000);
}

