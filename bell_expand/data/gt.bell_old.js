gt = { 
	isotope: {},
	filter: '*',
	countdownWarning: '1:00',
	countdownWarning2: '0:05',

	layoutOptions: {
		layoutMode: 'masonry',
		itemSelector: '.timer',
		masonry: {
			gutter: 6,
			columnWidth: '.timer'
		},
		getSortData: {
			active: '[data-active]',
			time: '[data-time]'
		},
		sortBy: ['active', 'time'],
		sortAscending: {
			active: false,
			time: true
		},
		transitionDuration: '0.6s'
	},

	updateIsotope: function() {
		gt.isotope.main.updateSortData();
		gt.isotope.main.arrange({ filter: gt.filter });

		gt.isotope.favorite.updateSortData();
		gt.isotope.favorite.arrange();
	}
};

gt.bell = {
	nodes: null,
	timers: null,
	nodeTemplate: null,
	timerTemplate: null,
	is24Hour: false,
	isInitialized: false,
	settings: {
		filters: [],
		favorites: [],
		tone: 'alarm1',
		tone2: 'alarm2',
		volume: 50,
		volume2: 50,
		warning: 60,
		warning2: 3,
		mute: false,
		list: false,
		unlimitedColumns: false,
		compact: false,
		search: ''
	},

	initialize: function() {
		Origami.fastclick(document.body);

		// Firefox isn't firing isotope transition end events, causing all kinds
		// of wackiness.  Disabled for now.
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
			gt.layoutOptions.transitionDuration = 0;

		gt.bell.updateTimer(new Date());
		gt.bell.nodeTemplate = doT.template($('#node-template').text());
		gt.bell.timerTemplate = doT.template($('#timer-template').text());

		var sample = gt.time.formatTime(new Date());
		if (sample.indexOf('M') == -1)
			gt.bell.is24Hour = true;

		var settings = gt.bell.loadSettings();

		gt.isotope.main = new Isotope('#main', gt.layoutOptions);
		gt.isotope.favorite = new Isotope('#favorite', gt.layoutOptions);
		gt.bell.renderTimers();

		if (settings.search)
			gt.bell.executeSearch(settings.search);

		if (settings.unlimitedColumns) {
			$('#unlimited-columns-setting').prop('checked', true);
			$('body').addClass('unlimited-columns');
		}

		if (settings.compact) {
			$('#compact-setting').prop('checked', true);
			$('body').addClass('compact');
		}

		if (!settings.favorites.length)
			$('#favorites-header').hide();

		gt.bell.updateFilters();
		gt.updateIsotope();

		gt.timer.updateKey = setInterval(gt.timer.update, 1000);

		$('#filters .filter').click(gt.bell.filterClicked);
		$('#alarm-toggle').click(gt.bell.alarmToggleClicked);
		$('#settings-toggle').click(gt.bell.settingToggleClicked);
		$('#mode-toggle').click(gt.bell.modeToggleClicked);
		$('#unlimited-columns-setting').click(gt.bell.unlimitedColumnsClicked);
		$('#compact-setting').click(gt.bell.compactSettingClicked);
		$('#volume').change(gt.bell.alarmVolumeChanged);
		$('#tone').change(gt.bell.alarmToneChanged);
		$('#warning').change(gt.bell.alarmWarningChanged);
		$('#volume2').change(gt.bell.alarmVolume2Changed);
		$('#tone2').change(gt.bell.alarmTone2Changed);
		$('#warning2').change(gt.bell.alarmWarning2Changed);
		$('#search').bind('input', gt.bell.searchInput);

		gt.bell.isInitialized = true;
	},

	renderTimers: function() {
		var now = new Date();
		var defs = _.union(gt.bell.nodes, gt.bell.timers);
		for (var i = 0; i < defs.length; i++) {
			var timer = gt.bell.createTimer(defs[i], now);
			var $node = $(timer.template(timer));
			gt.bell.appendTimer(timer, $node);
		}
	},

	appendTimer: function(view, $timer) {
		$timer.data('view', view);

		if (view.progress)
			$timer.data('next-spawn-change', view.progress.change.getTime() + 1001);

		if (_.contains(gt.bell.settings.favorites, view.id)) {
			$('#favorite').append($timer);
			gt.isotope.favorite.appended($timer);
		}
		else {
			$('#main').append($timer);
			gt.isotope.main.appended($timer);
		}

		$('.favorite-link', $timer).click(gt.bell.toggleFavoriteClicked);
	},

	createTimer: function(def, now) {
		var func = def.func || "node";
		var timer = new gt.timer[func](now, def);
		for (var i = 0; i < 1000; i++) {
			// 1000 iterations is just a precaution, should break before that.
			if (!timer.next(now))
				break;
		}

		timer.progress = gt.timer.progress(now, timer.period);
		timer.title = def.title;
		timer.id = def.id;
		timer.icon = def.icon;
		timer.desc = def.desc;
		timer.template = def.func ? gt.bell.timerTemplate : gt.bell.nodeTemplate;
		timer.def = def;
		return timer;
	},

	updateTimer: function(now) {	
		var currentEorzeaTime = gt.bell.formatHoursMinutesUTC(gt.time.localToEorzea(now));
		$('title').text(currentEorzeaTime + ' 갈론드 벨');
		$('#time').text(currentEorzeaTime);
	},

	formatHours: function(hour) {
		if (gt.bell.is24Hour)
			return hour;

		if (hour == 0)
			hour = 24;

		return ((hour - 1) % 12 + 1) + ' ' + (hour > 11 && hour < 24 ? 'PM' : 'AM');
	},

	formatHoursMinutesUTC: function(date) {
		var hours = date.getUTCHours();
		var minutes = gt.util.zeroPad(date.getUTCMinutes(), 2);

		if (gt.bell.is24Hour)
			return hours + ':' + minutes

		if (hours == 0)
			hours = 24;

		return ((hours - 1) % 12 + 1) + ':' + minutes + ' ' + (hours > 11 && hours < 24 ? 'PM' : 'AM');
	},
	formatHoursMinutesKST: function(date) {
		var hours = date.getUTCHours();
		var minutes = gt.util.zeroPad(date.getUTCMinutes(), 2);

		if (gt.bell.is24Hour)
			return hours + ':' + minutes

		if (hours == 0)
			hours = 24;

		return ((hours) % 12 + 1) + ':' + minutes + ' ' + (hours > 11 && hours < 24 ? 'PM' : 'AM');
	},


	filterClicked: function(e) {
		e.stopPropagation();

		$(this).toggleClass('active');

		var filters = _.map($('#filters .filter[data-invert=0]:not(.active)'), function(e) { return $(e).data('filter'); });
		var invertedFilters = _.map($('#filters .filter[data-invert=1].active'), function(e) { return $(e).data('filter'); });
		gt.bell.settings.filters = _.union(filters, invertedFilters);

		gt.bell.updateFilters();
		gt.bell.saveSettings();

		return false;
	},

	toggleFavoriteClicked: function(e) {
		e.stopPropagation();

		if (window.Notification && window.Notification.permission != "granted")
			window.Notification.requestPermission();

		var $timer = $(this).closest('.timer');
		var id = $timer.data('id');

		if ($timer.closest('#favorite').length) {
			gt.isotope.favorite.remove($timer);
			gt.bell.settings.favorites = _.without(gt.bell.settings.favorites, id);
		}
		else {
			gt.isotope.main.remove($timer);
			gt.bell.settings.favorites.push(id);
		}

		// Recreate the html.
		var view = $timer.data('view');
		$timer = $(view.template(view));
		gt.bell.appendTimer(view, $timer);

		gt.isotope.main.options.transitionDuration = 0;
		gt.updateIsotope();
		gt.isotope.main.options.transitionDuration = gt.layoutOptions.transitionDuration;

		$('#favorites-header').toggle(gt.bell.settings.favorites.length ? true : false);

		gt.bell.saveSettings();

		return false;
	},

	updateFilters: function() {
		var filters = _.map($('#filters .filter[data-invert=0]:not(.active)'), function(e) { return ':not(' + $(e).data('filter') + ')'; });
		var invertedFilters = _.map($('#filters .filter[data-invert=1].active'), function(e) { return $(e).data('filter'); });
		var allFilters = _.union(filters, invertedFilters);
		if ($('#search').val().length)
			allFilters.push('.search-match');

		gt.filter = allFilters.length ? allFilters.join('') : '*';

		if (gt.bell.isInitialized)
			gt.isotope.main.arrange({ filter: gt.filter });

		var visible = gt.isotope.main.filteredItems.length + gt.isotope.favorite.items.length;
		var hidden = gt.isotope.main.items.length - gt.isotope.main.filteredItems.length;
		var parts = [visible + ' 활성화 타이머'];
		if (hidden > 0)
			parts.push(hidden + ' 숨겨진 타이머');
		var stats = parts.join(', ');
		$('#node-stats').text(stats);
	},

	loadSettings: function() {
		if (!localStorage.bellSettings || localStorage.bellSettings.locationDisplay)
			return gt.bell.settings; // Filter old settings and no settings.

		var settings = JSON.parse(localStorage.bellSettings);

		if (settings.filters) {
			for (var i = 0; i < settings.filters.length; i++)
				$('#filters .filter[data-filter="' + settings.filters[i] + '"]').toggleClass('active');
		}

		if (settings.mute)
			$('#alarm-toggle').removeClass('active');

		if (settings.list) {
			$('body').addClass('list-mode');
			$('#mode-toggle').addClass('active');
		}

		if (settings.tone)
			$('#tone').val(settings.tone);
		else
			settings.tone = 'alarm1';

		if (settings.volume)
			$('#volume').val(settings.volume);
		else
			settings.volume = 50;

		if (settings.warning) {
			gt.countdownWarning = gt.time.formatHoursMinutesSeconds(settings.warning);
			$('#warning').val(settings.warning);
		}
		else
			settings.warning = 90;

		if (settings.tone2)
			$('#tone2').val(settings.tone2);
		else
			settings.tone2 = 'alarm2';

		if (settings.volume2)
			$('#volume2').val(settings.volume2);
		else
			settings.volume2 = 50;

		if (settings.warning2) {
			gt.countdownWarning2 = gt.time.formatHoursMinutesSeconds(settings.warning2);
			$('#warning2').val(settings.warning2);
		}
		else
			settings.warning2 = 5;

		if (settings.search)
			$('#search').val(settings.search);

		gt.bell.settings = settings;
		return settings;
	},

	saveSettings: function() {
		localStorage.bellSettings = JSON.stringify(gt.bell.settings);
	},

	alarmToggleClicked: function(e) {
		e.stopPropagation();

		$('#alarm-toggle').toggleClass('active');
		gt.bell.settings.mute = !gt.bell.settings.mute;
		if (!gt.bell.settings.mute)
			gt.bell.playAlarm();

		gt.bell.saveSettings();

		return false;
	},

	settingToggleClicked: function(e) {
		$('#settings').toggle();
		$('#settings-toggle').toggleClass('active');
	},

	modeToggleClicked: function(e) {
		$('#mode-toggle').toggleClass('active');
		$('body').toggleClass('list-mode');
		gt.bell.settings.list = !gt.bell.settings.list;
		gt.bell.saveSettings();
		gt.updateIsotope();
	},

	unlimitedColumnsClicked: function(e) {
		gt.bell.settings.unlimitedColumns = $(this).is(':checked');
		$('body').toggleClass('unlimited-columns', gt.bell.settings.unlimitedColumns);
		gt.updateIsotope();
		gt.bell.saveSettings();
	},

	compactSettingClicked: function(e) {
		gt.bell.settings.compact = $(this).is(':checked');
		$('body').toggleClass('compact', gt.bell.settings.compact);
		gt.updateIsotope();
		gt.bell.saveSettings();
	},

	alarmVolumeChanged: function(e) {
		gt.bell.settings.volume = $(this).val();
		gt.bell.playAlarm();
		gt.bell.saveSettings();
	},

	alarmToneChanged: function(e) {
		gt.bell.settings.tone = $(this).val();
		gt.bell.playAlarm();
		gt.bell.saveSettings();
	},

	alarmWarningChanged: function(e) {
		gt.bell.settings.warning = Number($(this).val());
		gt.countdownWarning = gt.time.formatHoursMinutesSeconds(gt.bell.settings.warning);
		gt.bell.saveSettings();
	},

	alarmVolume2Changed: function(e) {
		gt.bell.settings.volume2 = $(this).val();
		gt.bell.playAlarm2();
		gt.bell.saveSettings();
	},

	alarmTone2Changed: function(e) {
		gt.bell.settings.tone2 = $(this).val();
		gt.bell.playAlarm2();
		gt.bell.saveSettings();
	},

	alarmWarning2Changed: function(e) {
		gt.bell.settings.warning2 = Number($(this).val());
		gt.countdownWarning2 = gt.time.formatHoursMinutesSeconds(gt.bell.settings.warning2);
		gt.bell.saveSettings();
	},

	playAlarm: function() {
		var alarm = $('#' + gt.bell.settings.tone)[0];
        alarm.volume = gt.bell.settings.volume / 100;
        alarm.play();
	},

	playAlarm2: function() {
		var alarm = $('#' + gt.bell.settings.tone2)[0];
        alarm.volume = gt.bell.settings.volume2 / 100;
        alarm.play();
	},

	searchInput: function(e) {
		gt.bell.executeSearch($(this).val().toLowerCase());
		gt.bell.updateFilters();
		gt.bell.saveSettings();
	},

	executeSearch: function(query) {
		gt.bell.settings.search = query;

		_.each($('.node'), function(block) {
			var $block = $(block);
			var view = $block.data('view');

			var match = _.find(view.node.items, function(i) { return i.item.toLowerCase().indexOf(query) != -1; });
			if (match || (view.area.indexOf(query) != -1))
				$block.addClass('search-match');
			else
				$block.removeClass('search-match');
		});
	}
};

// gt.timer

gt.timer = {
	updateKey: null,

	baseline: function(current, daysBack) {
		var start = new Date(current);
		start.setUTCDate(start.getUTCDate() - daysBack);
		start.setUTCMinutes(0);
		start.setUTCHours(0);
		start.setUTCSeconds(0);
		return start;
	},

	progress: function(current, period) {
		// Start from a position of dormancy.
		var progress = {
			start: period.lastExpire,
			end: period.active,
			change: period.active,
			percent: null,
			time: null,
			countdown: null
		};

		var minutesDiff = (period.active.getTime() - current.getTime()) / 60000;
		if (minutesDiff > 0 && minutesDiff <= 5) {
			// Active within 5 minutes.
			progress.state = 'spawning';
			progress.time = gt.time.formatTime(progress.change);
		} else if (minutesDiff < 0 && minutesDiff > -period.mUp) {
			// Active for {mUp} minutes.
			progress.state = 'active';
			progress.start  = period.expire;
			progress.end = period.active;
			progress.change = period.expire;
			progress.time = gt.time.formatTime(period.expire);
		} else {
			// Dormant until 5 minutes before the next spawn.
			var spawning = new Date(period.active);
			spawning.setUTCMinutes(spawning.getUTCMinutes() - 5);
			progress.state = 'dormant';
			progress.change = spawning;
			progress.time = gt.time.formatTime(period.active);
		}

		progress.percent = gt.time.getPercentTimeDifference(progress.start, progress.end);
		progress.countdown = gt.time.formatCountdown(progress.start > progress.end ? progress.start : progress.end);

		return progress;
	},

	update: function() {
		var now = new Date();
		gt.bell.updateTimer(now);
		var epoch = now.getTime();
		var update = false;

		_.each($('.timer'), function(element) {
			var $timer = $(element);
			var view = $timer.data('view');

			// Update progress
			var nextChange = $timer.data('next-spawn-change');
			if (epoch >= nextChange) {
				view.next(now);
				view.progress = gt.timer.progress(now, view.period);

				$timer.removeClass('spawning active dormant').addClass(view.progress.state);
				$timer.data('next-spawn-change', view.progress.change.getTime() + 1001);
				$timer.attr('data-time', view.progress.end.getTime());
				$timer.attr('data-active', view.progress.state == 'active' ? 1 : 0);
				update = true;
			}

			// Update the progress bar.
			view.progress.percent = gt.time.getPercentTimeDifference(view.progress.start, view.progress.end);
			$('.progress', $timer).css('width', view.progress.percent + '%');

			// Update the remaining time.
			view.progress.countdown = gt.time.formatCountdown(view.progress.start > view.progress.end ? view.progress.start : view.progress.end);
			$('.spawn-time', $timer).text(view.progress.countdown + ' / ' + view.progress.time);

			// Play an alarm if spawning node is a favorite.

			if (!gt.bell.settings.mute
				&& view.progress.state == 'spawning'
				&& (view.progress.countdown == gt.countdownWarning || view.progress.countdown == gt.countdownWarning2)
				&& $timer.closest('#favorite').length) {

				if (view.progress.countdown == gt.countdownWarning)
					gt.bell.playAlarm();
				else
					gt.bell.playAlarm2();

				if (window.Notification && window.Notification.permission == "granted")
					view.notify();
			}
		});

		if (update)
			gt.updateIsotope();
	}
};

// gt.timer.GATE

gt.timer.GATE = function(now, def) {
	var active = gt.timer.baseline(now, 0);
	active.setUTCMinutes(def.minute);

	var expire = new Date(active);
	expire.setUTCMinutes(def.minute + 15);

	var lastExpire = new Date(expire);
	lastExpire.setUTCHours(lastExpire.getUTCHours() - 1);

	// Members
	this.period = { active: active, expire: expire, lastExpire: lastExpire, mUp: 15 };
	this.progress = null;
	this.type = 'GATE';
	this.title = null;
	this.id = null;
	this.desc = null;
};

gt.timer.GATE.prototype.next = function(now) {
	if (this.period.expire > now)
		return false; // No period changes if this one hasn't expired yet.

	this.period.lastExpire = this.period.expire;
	this.period.expire = new Date(this.period.expire);
	this.period.expire.setUTCHours(this.period.expire.getUTCHours() + 1);
	this.period.active.setUTCHours(this.period.active.getUTCHours() + 1);

	return true;
};

gt.timer.GATE.prototype.notify = function() {
	var n = new window.Notification(this.title, {
		icon: 'icons/GATE.png',
		body: this.desc + '\r\n' + this.progress.time + '\r\n',
		tag: this.id
	});

	setTimeout(function() { n.close(); }, 45 * 1000);
};

// gt.timer.node

gt.timer.node = function(now, def) {
	this.node = def;
	this.area = def.area || "Unknown Location";
	this.progress = null;
	this.type = 'node';

	if (def.type == '성목' || def.type == '약초밭')
		this.requiredClass = 'botanist';
	else
		this.requiredClass = 'miner';

	this.timeText = _.map(def.time, function(t) {
		return gt.bell.formatHours(t);
	}).join(', ');

	// Task filters
	var filters = [];
	if (_.any(def.items, function(i) { return i.collectable; }))
		filters.push('collectable');
	if (_.any(def.items, function(i) { return i.reduce; }))
		filters.push('reducible');
	if (_.any(def.items, function(i) { return i.scripName == "Blue Gatherers' Scrip"; }))
		filters.push('bluescrips');
	if (_.any(def.items, function(i) { return i.scripName == "Red Gatherers' Scrip"; }))
		filters.push('redscrips');

	this.filter = filters.join(' ');

	// Calculate period
	this.mUp = def.uptime / gt.time.epochTimeFactor;
	this.next(now);
};

gt.timer.node.prototype.next = function(now) {
	if (this.period && this.period.expire > now)
		return false; // No period changes if this one hasn't expired yet.

	var spawnTimes = gt.node.getSpawnTimes(gt.time.localToEorzea(now), this.node.time, this.node.uptime);
	this.period = {
		active: gt.time.eorzeaToLocal(spawnTimes.eNextSpawn),
		expire: gt.time.eorzeaToLocal(spawnTimes.eNextExpire),
		lastExpire: gt.time.eorzeaToLocal(spawnTimes.eExpire),
		mUp: this.mUp
	};

	return true;
};

gt.timer.node.prototype.notify = function() {
	var stars = this.node.stars ? (' ' + gt.util.repeat('*', this.node.stars)) : '';
	var title = 'Lv. ' + this.node.lvl + stars + ' ' + this.area;
	var items = _.map(this.node.items, function(i) { return '[' + i.slot + '] ' + i.item; });
	var n = new window.Notification(title, {
		icon: '/db/icons/item/' + this.node.items[0].icon + '.png',
		body: this.node.zone + ' ' + this.progress.time + '\r\n' + items.join(', '),
		tag: this.id
	});

	setTimeout(function() { n.close(); }, 45 * 1000);
};

// gt.node.js

gt.node = {
	getSpawnTimes: function(eStart, times, uptime) {
		var eSpawn = new Date(eStart);
		eSpawn.setUTCDate(eSpawn.getUTCDate() - 2);
		eSpawn.setUTCMinutes(0);
		eSpawn.setUTCHours(0);
		eSpawn.setUTCSeconds(0);

		var eSpawnPrevious, eExpirePrevious;
		while (true) {
			for (var i = 0; i < times.length; i++) {
				eSpawn.setUTCHours(times[i]);
				var eExpire = new Date(eSpawn);
				eExpire.setUTCMinutes(uptime);

				if (eExpire > eStart) {
					return { eSpawn: eSpawnPrevious, eExpire: eExpirePrevious, eNextSpawn: eSpawn, eNextExpire: eExpire  };
				} else {
					eSpawnPrevious = new Date(eSpawn);
					eExpirePrevious = new Date(eExpire);
				}
			}

			eSpawn.setUTCHours(0);
			eSpawn.setUTCDate(eSpawn.getUTCDate() + 1);
		}
	}
};

// gt.time.js

gt.time = {
	epochTimeFactor: 20.571428571428573, // 60 * 24 Eorzean minutes (one day) per 70 real-world minutes.
	millisecondsPerEorzeaMinute: (2 + 11/12) * 1000,
	millisecondsPerDay: 24 * 60 * 60 * 1000,
	hours: {hour: '2-digit'},
	hoursMinutes: {hour: '2-digit', minute: '2-digit'},
	hoursMinutesUTC: {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'},
	hoursMinutesSeconds: {hour: '2-digit', minute: '2-digit', second: '2-digit'},
	monthDay: {month: 'numeric', day: 'numeric'},

	localToEorzea: function(date) {
		return new Date(date.getTime() * gt.time.epochTimeFactor);
	},

	eorzeaToLocal: function(date) {
		return new Date(date.getTime() / gt.time.epochTimeFactor);
	},

	eCurrentTime: function() {
		return gt.time.localToEorzea(new Date());
	},

	formatTime: function(date, options) {
		return date.toLocaleTimeString(navigator.language, options || gt.time.hoursMinutesSeconds);
	},

	formatDateTime: function(date) {
		if (!date)
			return '(error)';
		
		return date.toLocaleDateString(navigator.language, gt.time.monthDay) + ' ' + gt.time.formatTime(date);
	},

	formatEorzeaHour: function(eDate) {
		return gt.util.zeroPad(eDate.getUTCHours(), 2);
	},

	getPercentTimeDifference: function(start, end) {
		var start = start.getTime();
		var end = end.getTime();
		var now = (new Date()).getTime();
		return ((now - start) / (end - start)) * 100;
	},

	formatCountdown: function(end) {
		var remainingSeconds = (end.getTime() - (new Date()).getTime()) / 1000;
		if (remainingSeconds <= 0)
			return '0:00';

		return gt.time.formatHoursMinutesSeconds(remainingSeconds);
	},

	formatHoursMinutesSeconds: function(totalSeconds) {
		var hours = Math.floor(totalSeconds / 3600);
		var minutes = Math.floor((totalSeconds % 3600) / 60);
		var seconds = Math.floor((totalSeconds % 3600) % 60);

		if (hours)	
			return hours + ':' + gt.util.zeroPad(minutes, 2) + ':' + gt.util.zeroPad(seconds, 2);
		else
			return minutes + ':' + gt.util.zeroPad(seconds, 2);
	}
};

// gt.util.js

gt.util = {
	repeat: function(str, times) {
		var result = "";
		for (var i = 0; i < times; i++)
			result += str;
		return result;
	},

	stars: function(stars) {
		return stars ? (' ' + gt.util.repeat('&#x2605', stars)) : '';
	},

	zeroPad: function(num, digits) {
		return ("00000000" + num).slice(-digits);
	},
};