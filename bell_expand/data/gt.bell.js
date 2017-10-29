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
	fish: null,
	bait: null,
	timers: null,
	nodeTemplate: null,
	fishContentTemplate: null,
	fishEntryTemplate: null,
	huntContentTemplate: null,
	timerTemplate: null,
	is24Hour: false,
	isInitialized: false,
	timeOffset: 0,
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
		colorblind: false,
		search: '',
		serverTime: false
	},

	initialize: function() {
		if (Origami) // Some content blockers block this.
			Origami.fastclick(document.body);

		// Firefox isn't firing isotope transition end events, causing all kinds
		// of wackiness.  Disabled for now.
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
			gt.layoutOptions.transitionDuration = 0;

		gt.bell.updateTimer(new Date());
		gt.bell.nodeTemplate = doT.template($('#node-template').text());
		gt.bell.timerTemplate = doT.template($('#timer-template').text());
		gt.bell.fishContentTemplate = doT.template($('#fish-content-template').text());
		gt.bell.fishEntryTemplate = doT.template($('#fish-entry-template').text());
		gt.bell.huntContentTemplate = doT.template($('#hunt-content-template').text());

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

		if (settings.colorblind) {
			$('#colorblind-setting').prop('checked', true);
			$('body').addClass('colorblind');
		}

		if (settings.serverTime) {
			$('#servertime-setting').prop('checked', true);
			gt.bell.getServerTime();
		}



		gt.bell.updateFilters();
		gt.updateIsotope();

		gt.timer.updateKey = setInterval(gt.timer.update, 1000);

		$('#filters .filter').click(gt.bell.filterClicked);
		$('#alarm-toggle').click(gt.bell.alarmToggleClicked);
		$('#settings-toggle').click(gt.bell.settingToggleClicked);
		$('#mode-toggle').click(gt.bell.modeToggleClicked);
		$('#unlimited-columns-setting').click(gt.bell.unlimitedColumnsClicked);
		$('#compact-setting').click(gt.bell.compactSettingClicked);
		$('#colorblind-setting').click(gt.bell.colorblindSettingClicked);
		$('#servertime-setting').click(gt.bell.serverTimeSettingClicked);
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
		var now = gt.time.now();

		// Nodes
		for (var i = 0; i < gt.bell.nodes.length; i++) {
			var def = gt.bell.nodes[i];
			def.func = 'node';
			var timer = gt.bell.createTimer(def, now);
			var $node = $(timer.template(timer));
			gt.bell.appendTimer(timer, $node);
		}

		// Fish
		for (var i = 0; i < gt.bell.fish.length; i++) {
			var def = gt.bell.fish[i];
			def.func = 'fish';
			var timer = gt.bell.createTimer(def, now);
			if (!timer.hasTimer)
				continue; // Skip for now.

			var $node = $(timer.template(timer));
			gt.bell.appendTimer(timer, $node);
		}

		// Other timers
		for (var i = 0; i < gt.bell.timers.length; i++) {
			var def = gt.bell.timers[i];
			var timer = gt.bell.createTimer(def, now);
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
		var timer = new gt.timer[def.func](now, def);
		if (timer.hasTimer) {
			for (var i = 0; i < 1000; i++) {
				// 1000 iterations is just a precaution, should break before that.
				if (!timer.next(now))
					break;
			}

			timer.progress = gt.timer.progress(now, timer.period);
		}

		timer.title = def.title;
		timer.id = def.id;
		timer.icon = def.icon;
		timer.desc = def.desc;
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
		var parts = [visible + ' timers'];
		if (hidden > 0)
			parts.push(hidden + ' hidden');
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

	colorblindSettingClicked: function(e) {
		gt.bell.settings.colorblind = $(this).is(':checked');
		$('body').toggleClass('colorblind', gt.bell.settings.colorblind);
		gt.bell.saveSettings();
	},

	serverTimeSettingClicked: function(e) {
		gt.bell.settings.serverTime = $(this).is(':checked');
		gt.bell.saveSettings();

		if (gt.bell.settings.serverTime)
			gt.bell.getServerTime();
		else 
			gt.time.timeOffset = 0;
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

		_.each($('.fish'), function(block) {
			var $block = $(block);
			var view = $block.data('view');
			if (view.def.title.toLowerCase().indexOf(query) != -1 || view.def.name.toLowerCase().indexOf(query) != -1)
				$block.addClass('search-match');
			else
				$block.removeClass('search-match');
		});
	},

	tokenizeBait: function(baitList) {
		var tokens = [];
		var separateBait = false;
		for (var i = 0; i < baitList.length; i++) {
			var name = baitList[i];
			if (!name) {
				separateBait = false;
				tokens.push({comma: 1});
				continue;
			}

			var bait = gt.bell.bait[name];
			if (separateBait)
				tokens.push({arrow: 1});

			tokens.push(bait);
			separateBait = true;
		}
		return tokens;
	},

	getServerTime: function() {
		$.get('time.php', function(result) {
			var date = new Date();
			gt.time.timeOffset = parseInt(result) - date.getTime();
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

			if (minutesDiff >= 1440)
				progress.time = gt.time.formatDateTime(period.active);
			else
				progress.time = gt.time.formatTime(period.active);
		}

		progress.percent = gt.time.getPercentTimeDifference(progress.start, progress.end);
		progress.countdown = gt.time.formatCountdown(progress.start > progress.end ? progress.start : progress.end);

		return progress;
	},

	update: function() {
		var now = gt.time.now();
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
	this.hasTimer = true;
	this.progress = null;
	this.type = 'GATE';
	this.title = null;
	this.id = null;
	this.desc = null;
	this.template = gt.bell.timerTemplate;
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

// gt.timer.hunt

gt.timer.hunt = function(now, def) {
	this.progress = null;
	this.period = null;
	this.type = 'hunt';
	this.def = def;
	this.template = gt.bell.timerTemplate;
	this.contentTemplate = gt.bell.huntContentTemplate;
	this.hasTimer = true;
	def.zone = def.title;

	if (def.fish)
		def.fish.baitTokens = gt.bell.tokenizeBait(def.fish.bait);

	// Calculate initial period.
	var lStart = new Date(now);
	lStart.setUTCHours(lStart.getUTCHours() - 8);
	this.next(lStart);
};

gt.timer.hunt.prototype.next = function(now) {
	if (this.period && this.period.expire > now)
		return false; // No period changes if this one hasn't expired yet.

	if (this.def.weather)
		gt.skywatcher.calculateNextPeriod(this, now);
	else if (this.def.fish)
		gt.skywatcher.calculateNextPeriod(this, now);
	else if (this.def.moon) {
		var active = gt.skywatcher.nextMoonPhase(gt.time.localToEorzea(now), this.def.moon.phase, this.def.moon.offset);

		var expire = new Date(active);
		expire.setUTCHours(expire.getUTCHours() + 12 + 18 - this.def.moon.offset);

		this.period = {
			active: gt.time.eorzeaToLocal(active),
			expire: gt.time.eorzeaToLocal(expire),
			lastExpire: this.period ? this.period.expire : now
		};
	} else if (this.def.name == "The Garlok") {
		this.period = { lastExpire: this.period ? this.period.expire : now };

		var period = this.period;
		var eStart = gt.skywatcher.getWeatherInterval(gt.time.localToEorzea(now));
		var eSpawnTicks = null;
		var lSpawnTime = null;
		var findExpiration = false;
		gt.skywatcher.iterateWeather(eStart, this.def.zone, function(weather, transitionWeather, eTime) {
			if (eSpawnTicks && eSpawnTicks < eTime.getTime()) {
				// This spawn time was accurate.
				findExpiration = true;
			}

			if (weather == "비" || weather == "폭우") {
				if (findExpiration) {
					period.expire = gt.time.eorzeaToLocal(eTime);
					return true;
				}

				var eCurrent = new Date(eTime);
				eCurrent.setUTCHours(eTime.getUTCHours() + 8);
				period.active = gt.time.eorzeaToLocal(eCurrent);
				period.active.setUTCMinutes(period.active.getUTCMinutes() + 200);
				eSpawnTicks = gt.time.localToEorzea(period.active).getTime();
			}
		});
	}

	this.period.mUp = (this.period.expire - this.period.active) / 60000;
	return true;
};

// gt.timer.fish

gt.timer.fish = function(now, def) {
	this.progress = null;
	this.period = null;
	this.type = 'fish';
	this.def = def;
	this.template = gt.bell.timerTemplate;
	this.contentTemplate = gt.bell.fishContentTemplate;

	def.baitTokens = gt.bell.tokenizeBait(def.bait);
	if (def.predator)
		def.predator.baitTokens = gt.bell.tokenizeBait(def.predator.bait);

	var filters = [];
			if (def.version == "2.0" || def.version == "2.4")
		filters.push('pre24');
	if (def.version == "2.5")
		filters.push('after24');
		if (def.version == "민감대물")
		filters.push('mingam');
					if (def.version == "모든날씨")
		filters.push('all');
	if (def.reduce)
		filters.push('reducible');
	if (def.scripName == "Blue Gatherers' Scrip")
		filters.push('bluescrips');
	if (def.scripName == "Red Gatherers' Scrip")
		filters.push('redscrips');

	this.filter = filters.join(' ');

	if (def.during || def.weather || def.transition) {
		this.hasTimer = true;

		// Calculate initial period.
		var lStart = new Date(now);
		lStart.setUTCHours(lStart.getUTCHours() - 8);
		this.next(lStart);
	} else {
		// No timers necessary.
		this.hasTimer = false;
	}
};

gt.timer.fish.prototype.next = function(now) {
	if (this.period && this.period.expire > now)
		return false; // No period changes if this one hasn't expired yet.

	gt.skywatcher.calculateNextPeriod(this, now);
	return true;
};

gt.timer.fish.prototype.notify = function() {
	var stars = this.def.stars ? (' ' + gt.util.repeat('*', this.def.stars)) : '';
	var spot = 'Lv. ' + this.def.lvl + stars + ' ' + this.def.category;
	var bait = this.def.bait.join(' -> ');

	var n = new window.Notification(this.def.name, {
		icon: '/db/icons/item/' + this.def.icon + '.png',
		body: this.def.title + ', ' + this.def.zone + '\r\n' + spot + ' @ ' + this.progress.time + '\r\n' + bait,
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
	this.template = gt.bell.nodeTemplate;
	this.hasTimer = true;

	if (def.type == '성목' || def.type == '약초밭')
		this.requiredClass = 'botanist';
	else
		this.requiredClass = 'miner';

	this.timeText = _.map(def.time, function(t) {
		return gt.bell.formatHours(t);
	}).join(', ');

	// Task filters
	var filters = [];
			if (def.version == "2.0" || def.version == "2.4")
		filters.push('pre24');
	if (def.version == "2.5")
		filters.push('after24');
		if (def.version == "민감대물")
		filters.push('mingam');
				if (def.version == "모든날씨")
		filters.push('all');

	if (_.any(def.items, function(i) { return i.collectable; }))
		filters.push('collectable');
	if (_.any(def.items, function(i) { return i.reduce; }))
		filters.push('reducible');
	if (_.any(def.items, function(i) { return i.scripName == "Blue Gatherers' Scrip"; }))
		filters.push('bluescrips');
	if (_.any(def.items, function(i) { return i.scripName == "Red Gatherers' Scrip"; }))
		filters.push('redscrips');

	this.filter = filters.join(' ');

	// Calculate initial period.
	this.mUp = def.uptime / gt.time.epochTimeFactor;
	this.next(now); // fixme remove, unnecessary
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
	var items = _.map(this.node.items, function(i) { return (i.slot ? '[' + i.slot + '] ' : '') + i.item; });
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
	timeOffset: 0,

	localToEorzea: function(date) {
		return new Date(date.getTime() * gt.time.epochTimeFactor);
	},

	eorzeaToLocal: function(date) {
		return new Date(date.getTime() / gt.time.epochTimeFactor);
	},

	eCurrentTime: function() {
		return gt.time.localToEorzea(gt.time.now());
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
		var now = (gt.time.now()).getTime();
		return ((now - start) / (end - start)) * 100;
	},

	formatCountdown: function(end) {
		var remainingSeconds = (end.getTime() - (gt.time.now()).getTime()) / 1000;
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
	},

	now: function() {
		var date = new Date();
		if (gt.time.timeOffset)
			date.setTime(date.getTime() + gt.time.timeOffset);
		return date;
	}
};

// gt.skywatcher.js

gt.skywatcher = {
	weatherIndex: ["","쾌청","맑음","흐림","안개","바람","강풍","비","폭우","번개","뇌우","모래먼지","모래폭풍","열파","작열파","눈","눈보라","요마의 안개","오로라","어둠","투기","흐림","뇌운","파랑","파랑","먹구름","작열파","요마의 안개","강풍","분화","맑음","맑음","맑음","맑음","맑음","극광","용핵","용핵","용핵","용핵","Shelf Clouds","Shelf Clouds","Shelf Clouds","Shelf Clouds","Oppression","Oppression","Oppression","Oppression","Oppression","Umbral Wind","Umbral Static","Smoke","맑음","Royal Levin","Hyperelectricity","Royal Levin"],
	zoneWeather: {"림사 로민사":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"중부 라노시아":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"저지 라노시아":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"동부 라노시아":[{"weather":4,"rate":5},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":7,"rate":95},{"weather":8,"rate":100}],"서부 라노시아":[{"weather":4,"rate":10},{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":80},{"weather":5,"rate":90},{"weather":6,"rate":100}],"고지 라노시아":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":9,"rate":90},{"weather":10,"rate":100}],"외지 라노시아":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":85},{"weather":7,"rate":100}],"안갯빛 마을":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"그리다니아 신시가지":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"그리다니아 구시가지":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"검은장막 숲 중부삼림":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"검은장막 숲 동부삼림":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"검은장막 숲 남부삼림":[{"weather":4,"rate":5},{"weather":10,"rate":10},{"weather":9,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],"검은장막 숲 북부삼림":[{"weather":4,"rate":5},{"weather":8,"rate":10},{"weather":7,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],"라벤더 안식처":[{"weather":3,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"울다하":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"서부 다날란":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"중부 다날란":[{"weather":11,"rate":15},{"weather":1,"rate":55},{"weather":2,"rate":75},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"동부 다날란":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":7,"rate":85},{"weather":8,"rate":100}],"남부 다날란":[{"weather":14,"rate":20},{"weather":1,"rate":60},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":4,"rate":100}],"북부 다날란":[{"weather":1,"rate":5},{"weather":2,"rate":20},{"weather":3,"rate":50},{"weather":4,"rate":100}],"하늘잔 마루":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"Ishgard":[{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"커르다스 중앙고지":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"Coerthas Western Highlands":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"모르도나":[{"weather":3,"rate":15},{"weather":4,"rate":30},{"weather":17,"rate":60},{"weather":1,"rate":75},{"weather":2,"rate":100}],"The Sea of Clouds":[{"weather":1,"rate":30},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":5,"rate":90},{"weather":49,"rate":100}],"Azys Lla":[{"weather":2,"rate":35},{"weather":3,"rate":70},{"weather":9,"rate":100}],"The Dravanian Forelands":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":9,"rate":30},{"weather":11,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"The Dravanian Hinterlands":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"The Churning Mists":[{"weather":3,"rate":10},{"weather":6,"rate":20},{"weather":50,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"Idyllshire":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}]},

	forecast: function(lDate, zone) {
		var weatherRate = gt.skywatcher.zoneWeather[zone];
		if (!weatherRate) {
			console.error("No weather rates for zone", zone);
			return null;
		}

		var forecastTarget = gt.skywatcher.calculateForecastTarget(lDate);
		var rate = _.find(weatherRate, function(r) { return forecastTarget < r.rate; });
		return gt.skywatcher.weatherIndex[rate.weather];
	},

	calculateForecastTarget: function(lDate) {
		// Thanks to Rogueadyn's SaintCoinach library for this calculation.

	    var unixSeconds = parseInt(lDate.getTime() / 1000);
        // Get Eorzea hour for weather start
        var bell = unixSeconds / 175;

        // Do the magic 'cause for calculations 16:00 is 0, 00:00 is 8 and 08:00 is 16
        var increment = (bell + 8 - (bell % 8)) % 24;

        // Take Eorzea days since unix epoch
        var totalDays = unixSeconds / 4200;
        totalDays = (totalDays << 32) >>> 0; // uint

        // 0x64 = 100
        var calcBase = totalDays * 100 + increment;

        // 0xB = 11
        var step1 = ((calcBase << 11) ^ calcBase) >>> 0; // uint
        var step2 = ((step1 >>> 8) ^ step1) >>> 0; // uint

        // 0x64 = 100
        return step2 % 100;
	},

	getWeatherInterval: function(eDate) {
		var eWeather = new Date(eDate ? eDate : gt.time.eCurrentTime());
		eWeather.setUTCHours(parseInt(eWeather.getUTCHours() / 8) * 8);
		eWeather.setUTCMinutes(0);
		eWeather.setUTCSeconds(0);
		return eWeather;
	},

	iterateWeather: function(eStart, zone, callback)  {
		var eCurrent = new Date(eStart);
		eCurrent.setUTCHours(eCurrent.getUTCHours() - 8);
		var transitionWeather = gt.skywatcher.forecast(gt.time.eorzeaToLocal(eCurrent), zone);
		for (var i = 0; i < 200000; i++) {
			eCurrent.setUTCHours(eCurrent.getUTCHours() + 8);
			var weather = gt.skywatcher.forecast(gt.time.eorzeaToLocal(eCurrent), zone);
			var result = callback(weather, transitionWeather, eCurrent);
			if (result)
				return result;

			transitionWeather = weather;
		}

		console.error('Infinite iteration detected', zone.name, eStart);
	},

	calculateNextPeriod: function(timer, now) {
		var eStart;
		if (timer.period) {
			eStart = gt.time.localToEorzea(timer.period.expire);
			eStart.setUTCHours(eStart.getUTCHours() + 8);
		} else
			eStart = gt.time.localToEorzea(now);

		var results = gt.skywatcher.calculateWindow(eStart, timer.def);

		timer.period = {
			active: gt.time.eorzeaToLocal(results.active),
			expire: gt.time.eorzeaToLocal(results.expire),
			lastExpire: timer.period ? timer.period.expire : null
		};

		timer.period.mUp = (timer.period.expire - timer.period.active) / 60000;

		// If no expiration was encountered in the last 8 hours default to now.
		if (!timer.period.lastExpire)
			timer.period.lastExpire = now;
	},

	calculateWindow: function(eStart, options) {
		var eStartInterval = gt.skywatcher.getWeatherInterval(eStart);

		var hourCheck = null;
		if (options.during) {
			if (options.during.start < options.during.end)
				hourCheck = function(h) { return h >= options.during.start && h < options.during.end; };
			else
				hourCheck = function(h) { return h >= options.during.start || h < options.during.end; };
		}

		var results = { };

		results.active = gt.skywatcher.iterateWeather(eStartInterval, options.zone, function(weather, transitionWeather, eTime) {
			if (options.transition && !_.contains(options.transition, transitionWeather))
				return;

			if (options.weather && !_.contains(options.weather, weather))
				return;

			if (hourCheck) {
				var eCheckTime = new Date(eTime);
				// Check all the hours between the time this weather starts and the time it ends.
				for (var i = 0; i < 8; i++) {
					var hour = eCheckTime.getUTCHours();
					if (hourCheck(hour)) {
						// Last check, it's happening!!
						return eCheckTime;
					}

					eCheckTime.setUTCHours(hour + 1);
				}

				return;
			}

			// All other checks passed.
			return eTime;
		});

		// Additional transforms after conditions are met.
		if (options.after) {
			if (options.after.eorzeaHours)
				results.active.setUTCHours(results.active.getUTCHours() + options.after.eorzeaHours);
		}

		// Now find when it expires.
		var eActive = gt.skywatcher.getWeatherInterval(results.active);
		results.expire = gt.skywatcher.iterateWeather(eActive, options.zone, function(weather, transitionWeather, eTime) {
			var eEnd = new Date(eTime);
			eEnd.setUTCHours(eEnd.getUTCHours() + 8);

			if (eEnd < results.active)
				return; // Doesn't start fast enough.

			if (options.transition && !_.contains(options.transition, transitionWeather))
				return eTime;

			if (options.weather && !_.contains(options.weather, weather))
				return eTime;

			if (hourCheck) {
				var eCheckTime = new Date(eTime);
				// Check all the hours between the time this weather starts and the time it ends.
				for (var i = 0; i < 7; i++) {
					var hour = eCheckTime.getUTCHours();
					if (eCheckTime > results.active && !hourCheck(hour)) {
						return eCheckTime;
					}

					eCheckTime.setUTCHours(hour + 1);
				}
			}

			// Must still be happening.
		});

		return results;
	},

	daysIntoLunarCycle: function(eDate) {
		return (eDate.getTime() / (1000 * 60 * 60 * 24)) % 32;
	},

	nextMoonPhase: function(eDate, moon, interCycleHourOffset) {
		var daysIntoCycle = gt.skywatcher.daysIntoLunarCycle(eDate);
		var daysNeeded = moon * 4;

		var offsetDays;
		if (daysIntoCycle < daysNeeded) // Next phase shift (midnight)
			offsetDays = daysNeeded - daysIntoCycle;
		else if (daysIntoCycle < (daysNeeded + 4)) // Next night accounting for the inter-cycle offset.
			offsetDays = (1 - (daysIntoCycle - daysNeeded)) - (interCycleHourOffset/24);
		else
			offsetDays = daysNeeded + (32 - daysIntoCycle);

		var ticks = eDate.getTime() + (offsetDays * gt.time.millisecondsPerDay);
		return new Date(ticks);
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