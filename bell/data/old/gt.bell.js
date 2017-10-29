gt = { 
	isotope: {},
	countdownWarning: '1:00',
	countdownWarning2: '0:05',
	isTouchDevice: false,

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
		for (var key in gt.isotope) {
			var iso = gt.isotope[key];
			iso.updateSortData();
			iso.arrange();
		}
	},

	t: function(obj) {
		return gt.locale.translate(obj);
	},

	tw: function(str) {
		// So nasty
		var regex = /[a-zA-Z\s]+[a-zA-Z$]+/;
		var word = regex.exec(str)[0];
		var value = str.split(regex)[1];
		return gt.locale.translate(word) + value;
	}
};

gt.bell = {
	nodes: null,
	fish: null,
	bait: null,
	timers: null,
	timerMap: null,
	nodeContentTemplate: null,
	fishContentTemplate: null,
	fishEntryTemplate: null,
	huntContentTemplate: null,
	listEntryTemplate: null,
	timerTemplate: null,
	timerListTemplate: null,
	mapTemplate: null,
	is24Hour: false,
	isInitialized: false,
	timeOffset: 0,
	settings: {
		filters: [],
		lists: [],
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
		serverTime: false,
        timeline: true,
        maps: true
	},
	starredTimers: { },
	timerElements: { },

	initialize: function() {
		if ('ontouchstart' in window) {
			if (Origami) // Some content blockers block this.
				Origami.fastclick(document.body);
			gt.isTouchDevice = true;
			$('body').addClass('touch');
		}

		// Firefox isn't firing isotope transition end events, causing all kinds
		// of wackiness.  Disabled for now.
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
			gt.layoutOptions.transitionDuration = 0;

		gt.bell.mainTemplate = doT.template($('#main-template').text());
		$('body').html(gt.bell.mainTemplate());

		gt.bell.updateTimer(new Date());
		gt.bell.nodeContentTemplate = doT.template($('#node-content-template').text());
		gt.bell.timerTemplate = doT.template($('#timer-template').text());
		gt.bell.fishContentTemplate = doT.template($('#fish-content-template').text());
		gt.bell.fishEntryTemplate = doT.template($('#fish-entry-template').text());
		gt.bell.huntContentTemplate = doT.template($('#hunt-content-template').text());
		gt.bell.listEntryTemplate = doT.template($('#list-entry-template').text());
		gt.bell.timerListTemplate = doT.template($('#timer-list-template').text());
		gt.bell.mapTemplate = doT.template($('#page-map-template').text());

		var allTimers = _.union(gt.bell.nodes, gt.bell.fish, gt.bell.timers);
		gt.bell.timerMap = _.reduce(allTimers, function(memo, t) { memo[t.id] = t; return memo; }, {});

		var sample = gt.time.formatTime(new Date());
		if (sample.indexOf('M') == -1)
			gt.bell.is24Hour = true;

		var settings = gt.bell.loadSettings();

		gt.isotope.main = new Isotope('#main', gt.layoutOptions);

		// Store a list of starred timers for reference.
		for (var i = 0; i < settings.lists.length; i++) {
			for (var id in settings.lists[i].timers)
				gt.bell.starredTimers[id] = 1;
		}

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
            
        gt.bell.initializeStarred();
		gt.bell.updateTimers();

		if (settings.search)
			gt.bell.executeSearch(settings.search);

		gt.timeline.render();
		gt.map.render();

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
        $('#timeline-header').click(gt.bell.timelineHeaderClicked);
        $('#maps-header').click(gt.bell.mapsHeaderClicked);
        $('#list-popover').click(gt.bell.listPopoverClicked);

        gt.bell.preloadAudioTags();

		gt.bell.isInitialized = true;
	},

	preloadAudioTags: function() {
		if (!gt.bell.settings.mute) {
			$('#' + gt.bell.settings.tone).attr("preload", "auto");
			$('#' + gt.bell.settings.tone2).attr("preload", "auto");
		}
	},

	initializeStarred: function() {
		var now = gt.time.now();

		var lists = gt.bell.settings.lists;
		for (var i = 0; i < lists.length; i++)
			gt.bell.initializeStarredList(lists[i], now);
	},

	initializeStarredList: function(list, now) {
		var $timerList = $(gt.bell.timerListTemplate(list));

		$('#timer-lists').append($timerList);
		var isotope = new Isotope('#' + list.id + ' .node-list', gt.layoutOptions);
		gt.isotope[list.id] = isotope;

		for (var i = 0 ; i < list.timers.length; i++) {
			var def = gt.bell.timerMap[list.timers[i]];
			def.isStarred = 1;
			gt.bell.activateStarredTimer(def, now, list);
		}

		isotope.arrange();

		$('.header', $timerList).click(gt.bell.timerListHeaderClicked);
	},

	updateTimers: function() {
		var now = gt.time.now();
		var filters = gt.bell.convertFilters(gt.bell.settings.filters);
		var isotope = gt.isotope.main;

		// Mark existing timers inactive.
		for (var key in gt.bell.timerElements)
			gt.bell.timerElements[key].active = 0;

		// Nodes
		for (var i = 0; i < gt.bell.nodes.length; i++) {
			var def = gt.bell.nodes[i];
			if (!filters.miner && (def.type == "광맥" || def.type == "바위터"))
				continue;
			if (!filters.botanist && (def.type == "약초밭" || def.type == "성목"))
				continue;
			if (!filters.unspoiled && def.name == "미지의")
				continue;
			if (!filters.ephemeral && def.name == "시간의")
				continue;
			if (!filters.legendary && def.name == "전설의")
				continue;
			if (filters.collectableOnly && !_.any(def.items, function(i) { return i.collectable; }))
				continue;
			if (filters.reducibleOnly && !_.any(def.items, function(i) { return i.reduce; }))
				continue;
			if (filters.bluescripsOnly && !_.any(def.items, function(i) { return i.scripname == "채집가용 화폐:청화"; }))
				continue;
			if (filters.redscripsOnly && !_.any(def.items, function(i) { return i.scripname == "채집가용 화폐:적화"; }))
				continue;

			gt.bell.activateTimer(def, now, isotope);
		}

		// Fish
		if (filters.fish) {
			for (var i = 0; i < gt.bell.fish.length; i++) {
				var def = gt.bell.fish[i];
				if (filters.collectableOnly && !def.collectable)
					continue;
				if (filters.reducibleOnly && !def.reduce)
					continue;
				if (filters.bluescripsOnly && def.scripname != "채집가용 화폐:청화")
					continue;
				if (filters.redscripsOnly && def.scripname != "채집가용 화폐:적화")
					continue;

				gt.bell.activateTimer(def, now, isotope);
			}
		}

		// Other timers
		if (filters.gate || filters.hunt) {
			for (var i = 0; i < gt.bell.timers.length; i++) {
				var def = gt.bell.timers[i];
				if (def.func == 'hunt' && !filters.hunt)
					continue;
				if (def.func == 'GATE' && !filters.gate)
					continue;

				gt.bell.activateTimer(def, now, isotope);
			}
		}

		// Remove any inactive timers.
		for (var key in gt.bell.timerElements) {
			var info = gt.bell.timerElements[key];
			if (!info.active) {
				isotope.remove(info.element);
				delete gt.bell.timerElements[key];
			}
		}

		// Arrange the new timers.
		isotope.arrange();

		// Stats
		var total = gt.bell.timers.length + gt.bell.fish.length + gt.bell.nodes.length;
		var visible = isotope.filteredItems.length;
		var hidden = total - visible;
		var parts = [visible + ' ' + gt.t('timers')];
		if (hidden > 0)
			parts.push(hidden + ' ' + gt.t('hidden'));
		var stats = parts.join(', ');
		$('#node-stats').text(stats);
	},

	convertFilters: function(filters) {
		return {
			// Classes
			miner: !_.contains(filters, '.miner'),
			botanist: !_.contains(filters, '.botanist'),
			fish: !_.contains(filters, '.fish'),

			// Types
			unspoiled: !_.contains(filters, '.unspoiled'),
			ephemeral: !_.contains(filters, '.ephemeral'),
			legendary: !_.contains(filters, '.legendary'),

			// Tasks (inverted)
			collectableOnly: _.contains(filters, '.collectable'),
			reducibleOnly: _.contains(filters, '.reducible'),
			bluescripsOnly: _.contains(filters, '.bluescrips'),
			redscripsOnly: _.contains(filters, '.redscrips'),

			// Other
			gate: !_.contains(filters, '.GATE'),
			hunt: !_.contains(filters, '.hunt')
		};
	},

	activateStarredTimer: function(def, now, list) {
		var isotope = gt.isotope[list.id];
		return gt.bell.activateTimer(def, now, isotope);
	},

	activateTimer: function(def, now, isotope) {
		if (isotope == gt.isotope.main && gt.bell.timerElements[def.id]) {
			gt.bell.timerElements[def.id].active = true;
			return;
		}

		var timer = gt.bell.createTimer(def, now);
		timer.star = def.isStarred;
		var $timer = $(timer.template(timer));

		if (isotope == gt.isotope.main)
			gt.bell.timerElements[timer.id] = { element: $timer, active: true };

		$timer.data('view', timer);

		if (timer.progress)
			$timer.data('next-spawn-change', timer.progress.change.getTime() + 1001);

		if (isotope) {
			isotope.$element.append($timer);
			isotope.appended($timer);
		}

		$('.title .star', $timer).click(gt.bell.starClicked);

		return $timer;
	},

	createTimer: function(def, now) {
		var timer = new gt.timer[def.func](now, def);
		for (var i = 0; i < 1000; i++) {
			// 1000 iterations is just a precaution, should break before that.
			if (!timer.next(now))
				break;
		}

		timer.progress = gt.timer.progress(now, timer.period);

		timer.title = def.title;
		timer.id = def.id;
		timer.desc = def.desc;
		timer.def = def;
		return timer;
	},

	updateTimer: function(now) {
		var eNow = gt.time.localToEorzea(now);
		var currentEorzeaTime = gt.bell.formatHoursMinutesUTC(eNow);

		// Set time value.
		$('#time').text(currentEorzeaTime);

		// Set title.
		var items = [];
		for (var i = 0; i < gt.bell.settings.lists.length; i++) {
			var list = gt.bell.settings.lists[i];
			if (!list.active)
				continue;

			var isotope = gt.isotope[list.id];
			items.push(isotope.filteredItems[0]);
		}

		items = _.sortBy(items, function(i) { return parseInt(i.sortData.time); });

		var title = currentEorzeaTime;
		if (items.length) {
		 	var progress = $(items[0].element).data('view').progress;
		 	title += ' [' + progress.countdown + (progress.state == "active" ? "+" : "") + ']';
		}

		$('title').text(title + ' 갈론드 벨');

		// Tick the timeline.
		gt.timeline.tick(eNow);
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

		var $this = $(this);

		// Handle exclusive tasks.		
		var exclusiveTag = $this.data('exclusive');
		if (exclusiveTag && !$this.hasClass('active'))
			$('#filters .filter[data-exclusive=' + exclusiveTag + '].active').removeClass('active');

		$this.toggleClass('active');

		// Record filter state.
		var filters = _.map($('#filters .filter[data-invert=0]:not(.active)'), function(e) { return $(e).data('filter'); });
		var invertedFilters = _.map($('#filters .filter[data-invert=1].active'), function(e) { return $(e).data('filter'); });
		gt.bell.settings.filters = _.union(filters, invertedFilters);

		gt.bell.updateTimers();
		gt.bell.executeSearch(gt.bell.settings.search);
		gt.bell.saveSettings();

		return false;
	},

	listPopoverClicked: function(e) {
		// Takes precedence over the body click which dismisses the popover.
		e.stopPropagation();
		return false;
	},

	dismissListPopover: function(e) {
		$('#list-popover').hide();
		$('body').unbind('click');
	},

	starClicked: function(e) {
		e.stopPropagation();

		var $timer = $(this).closest('.timer');
		var view = $timer.data('view');
		var timerid = $timer.data('id');

		if ($timer.hasClass('star') && !$timer.closest('#main').length) {
			var $containerList = $timer.closest('.timer-list');
			var listid = $containerList.attr('id');			
			var isotope = gt.isotope[listid];
			isotope.remove($timer);

			var list = _.find(gt.bell.settings.lists, function(l) { return l.id == listid; });
			list.timers = _.without(list.timers, timerid);
			if (!list.timers.length) {
				// Remove empty lists.
				$containerList.remove();
				isotope.destroy();
				delete gt.isotope[listid];
				gt.bell.settings.lists = _.without(gt.bell.settings.lists, list);
			} else {
				isotope.arrange();
			}

			// Remove filled star from main list if this is the last one.
			var $otherTimers = $('#timer-lists .timer[data-id="' + timerid + '"]').not($timer);
			if (!$otherTimers.length) {
				view.def.isStarred = 0;
				$('#main .timer[data-id="' + timerid + '"]').removeClass('star');
			}

			gt.timeline.render();
			gt.map.render();

			gt.bell.saveSettings();
			return false;
		}

		// Not starred.  Find the list to add this timer to.
		var $popover = $('#list-popover-entries');
		$popover.data('id', timerid);

		// Create the popover list entries.
		var entries = _.map(gt.bell.settings.lists, gt.bell.listEntryTemplate);
		entries.push('<div class="entry new">새로운 리스트 만들기</div>');
		$popover.empty().append(entries);

		// Show the timer in the popover.
		var $popoverTimer = gt.bell.activateTimer(view.def, gt.time.now(), null);
		$('.star', $popoverTimer).unbind('click');
		$('#list-popover-timer').empty().append($popoverTimer);

		$('#list-popover').show();

		// Bind events
		$('body').click(gt.bell.dismissListPopover);
		$('.entry', $popover).click(gt.bell.listEntryClicked);

		return false;
	},

	listEntryClicked: function(e) {
		e.stopPropagation();

		var $this = $(this);
		var timerid = $('#list-popover-entries').data('id');
		var def = gt.bell.timerMap[timerid];
		var now = gt.time.now();

		if ($this.hasClass('new')) {
			// Create new list for this timer.
			var name = prompt("새로운 리스트의 이름을 입력하세요.");
			if (!name)
				return false;

			var listid = gt.util.sanitize(name);
			if (gt.isotope[listid]) {
				alert('A list with this name already exists.');
				return false;
			}

			var list = {name: name, id: listid, timers: [timerid], active: true};
			gt.bell.initializeStarredList(list, now);
			gt.bell.settings.lists.push(list);
			$('#main .timer[data-id="' + timerid + '"]').addClass('star');

			gt.bell.saveSettings();
		} else {
			// Add to the existing list.
			var listid = $this.data('id');
			var list = _.find(gt.bell.settings.lists, function(l) { return l.id == listid; });

			if (!_.contains(list.timers, timerid)) {
				// Add only when the list doesn't already contain the timer.
				list.timers.push(timerid);

				def.isStarred = 1;
				gt.bell.activateStarredTimer(def, now, list);
				gt.isotope[listid].arrange();
				$('#main .timer[data-id="' + timerid + '"]').addClass('star');

				gt.bell.saveSettings();
			}
		}

		gt.timeline.render();
		gt.map.render();

	 	if (window.Notification && window.Notification.permission != "granted")
	 		window.Notification.requestPermission();

		gt.bell.dismissListPopover();
		return false;
	},

	loadSettings: function() {
		var settings = gt.bell.settings;
		if (localStorage.bellSettings) {
			// Compat to be removed.
			if (!localStorage.bellSettings.locationDisplay)
				settings = JSON.parse(localStorage.bellSettings);
		}

		if (settings.favorites) {
			settings.lists = [{name: 'Favorites', id: 'Favorites', timers: settings.favorites}];
			delete settings.favorites;
		}

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
            
        if (settings.timeline)
            $('#timeline, #timeline-header').addClass('active');

        if (settings.maps)
        	$('#maps, #maps-header').addClass('active');

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
    
    timelineHeaderClicked: function(e) {
        gt.bell.settings.timeline = !gt.bell.settings.timeline;
        $('#timeline, #timeline-header').toggleClass('active');
        gt.bell.saveSettings();
    },

    mapsHeaderClicked: function(e) {
    	if (gt.bell.settings.maps) {
    		$('#maps').empty();
    		gt.bell.settings.maps = false;
    	} else {
    		gt.bell.settings.maps = true;
    		gt.map.render();
    	}

    	$('#maps-header').toggleClass('active');
    	gt.bell.saveSettings();
    },

    timerListHeaderClicked: function(e) {
    	var $this = $(this);
    	var $containerList = $this.closest('.timer-list');

    	var listid = $containerList.attr('id');

    	var list = _.find(gt.bell.settings.lists, function(l) { return l.id == listid; });
    	list.active = !list.active;
    	$containerList.toggleClass('active', list.active);

    	if (list.active) {
    		var isotope = gt.isotope[listid];
    		isotope.options.transitionDuration = 0;
    		isotope.arrange();
        	isotope.transitionDuration = gt.layoutOptions.transitionDuration;
    	}

    	gt.timeline.render();
    	gt.map.render();

    	gt.bell.saveSettings();
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
		gt.bell.saveSettings();
	},

	executeSearch: function(query) {
		gt.bell.settings.search = query;
		if (!query) {
			gt.isotope.main.arrange({filter: '*'});
			return;
		}

		var list = gt.isotope.main.items;
		for (var i = 0; i < list.length; i++) {
			var $element = $(list[i].element);
			var view = $element.data('view');

			var match = false;

			// Check contained items.
			if (view.def.items) {
				if (_.find(view.def.items, function(i) { return i.item.toLowerCase().indexOf(query) != -1; }))
					match = true;
			}

			// Title and name
			if (view.title.toLowerCase().indexOf(query) != -1)
				match = true;
			if (view.def.name && view.def.name.toLowerCase().indexOf(query) != -1)
				match = true;

			$element.toggleClass('search-match', match);
		}

		gt.isotope.main.arrange({filter: '.search-match'});
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
			progress.time = gt.time.formatTime(gt.time.removeOffset(progress.change));
		} else if (minutesDiff < 0 && minutesDiff > -period.mUp) {
			// Active for {mUp} minutes.
			progress.state = 'active';
			progress.start  = period.expire;
			progress.end = period.active;
			progress.change = period.expire;
			progress.time = gt.time.formatTime(gt.time.removeOffset(period.expire));
		} else {
			// Dormant until 5 minutes before the next spawn.
			var spawning = new Date(period.active);
			spawning.setUTCMinutes(spawning.getUTCMinutes() - 5);
			progress.state = 'dormant';
			progress.change = spawning;

			if (minutesDiff >= 1440)
				progress.time = gt.time.formatDateTime(gt.time.removeOffset(period.active));
			else
				progress.time = gt.time.formatTime(gt.time.removeOffset(period.active));
		}

		progress.percent = gt.time.getPercentTimeDifference(progress.start, progress.end);
		progress.countdown = gt.time.formatCountdown(progress.start > progress.end ? progress.start : progress.end);

		return progress;
	},

	update: function() {
		var now = gt.time.now();
		var epoch = now.getTime();
		var update = false;
		var starUpdate = false;

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

				if (!starUpdate && $timer.hasClass('star'))
					starUpdate = true;
			}

			// Update the progress bar.
			view.progress.percent = gt.time.getPercentTimeDifference(view.progress.start, view.progress.end);
			$('.progress', $timer).css('width', view.progress.percent + '%');

			// Update the remaining time.
			view.progress.countdown = gt.time.formatCountdown(view.progress.start > view.progress.end ? view.progress.start : view.progress.end);
			$('.spawn-time', $timer).text(view.progress.countdown + ' / ' + view.progress.time);

			// Play an alarm if spawning node is a favorite.

			if (view.progress.state == 'spawning' && (view.progress.countdown == gt.countdownWarning || view.progress.countdown == gt.countdownWarning2)) {
				if (!gt.bell.settings.mute && $timer.closest('.timer-list.active').length) {
					if (view.progress.countdown == gt.countdownWarning)
						gt.bell.playAlarm();
					else
						gt.bell.playAlarm2();

					if (window.Notification && window.Notification.permission == "granted")
						view.notify();
				}
			}
		});

		gt.bell.updateTimer(now);

		if (update)
			gt.updateIsotope();

		if (starUpdate)
			gt.map.render();
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
	this.template = gt.bell.timerTemplate;
	this.icon = './images/GATE.png';
	this.tooltip = def.title;
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
		icon: this.icon,
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
	this.icon = './images/' + def.iconName + '.png';
	this.tooltip = def.name;
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
	} else if (this.def.name == "갈록") {
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
	this.icon = './db/items/' + def.icon + '.png';
	this.tooltip = def.name;

	if (def.zone && def.coords)
		this.map = gt.map.getViewModel(def.zone, def.coords);

	def.baitTokens = gt.bell.tokenizeBait(def.bait);
	if (def.predator)
		def.predator.baitTokens = gt.bell.tokenizeBait(def.predator.bait);

	var filters = [];
	if (def.reduce)
		filters.push('reducible');
	if (def.scripName == "채집가용 화폐:청화")
		filters.push('bluescrips');
	if (def.scripName == "채집가용 화폐:적화")
		filters.push('redscrips');

	this.filter = filters.join(' ');

	// Calculate initial period.
	var lStart = new Date(now);
	lStart.setUTCHours(lStart.getUTCHours() - 8);
	this.next(lStart);
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
		icon: this.icon,
		body: this.def.title + ', ' + this.def.zone + '\r\n' + spot + ' @ ' + this.progress.time + '\r\n' + bait,
		tag: this.id
	});

	setTimeout(function() { n.close(); }, 45 * 1000);
};

// gt.timer.node

gt.timer.node = function(now, def) {
	this.node = def;
	this.progress = null;
	this.type = 'node';
	this.template = gt.bell.timerTemplate;
	this.contentTemplate = gt.bell.nodeContentTemplate;
	this.icon = './db/items/' + def.items[0].icon + '.png';
	this.tooltip = def.items[0].item;
	this.zone = def.zone;

	if (def.zone && def.coords)
		this.map = gt.map.getViewModel(def.zone, def.coords);

	if (def.condition)
		this.condition = gt.t(def.condition);
	if (def.bonus)
		this.bonus = gt.t(def.bonus);

	if (def.type == '성목' || def.type == '약초밭')
		this.requiredClass = 'botanist';
	else
		this.requiredClass = 'miner';

	this.timeText = _.map(def.time, function(t) {
		return gt.bell.formatHours(t);
	}).join(', ');

	// Task filters
	var filters = [this.requiredClass, def.name.toLowerCase()];
	if (_.any(def.items, function(i) { return i.collectable; }))
		filters.push('collectable');
	if (_.any(def.items, function(i) { return i.reduce; }))
		filters.push('reducible');
	if (_.any(def.items, function(i) { return i.scripName == "채집가용 화폐:청화"; }))
		filters.push('bluescrips');
	if (_.any(def.items, function(i) { return i.scripName == "채집가용 화폐:적화"; }))
		filters.push('redscrips');

	this.filter = filters.join(' ');

	// Calculate initial period.
	this.mUp = def.uptime / gt.time.epochTimeFactor;
	this.next(now); // fixme remove, unnecessary
};

gt.timer.node.prototype.next = function(now) {
	if (this.period && this.period.expire > now)
		return false; // No period changes if this one hasn't expired yet.

	var nextPeriod = this.getPeriod(gt.time.localToEorzea(now));
	if (!this.period) {
		var lastActive = gt.time.localToEorzea(nextPeriod.lastExpire);
		lastActive.setUTCMinutes(lastActive.getUTCMinutes() - this.mUp);
		this.lastPeriod = this.getPeriod(lastActive);
	} else
		this.lastPeriod = this.period;

	this.period = nextPeriod;
	return true;
};

gt.timer.node.prototype.getPeriod = function(from) {
	var spawnTimes = this.getSpawnTimes(from);
	return {
		active: gt.time.eorzeaToLocal(spawnTimes.eNextSpawn),
		expire: gt.time.eorzeaToLocal(spawnTimes.eNextExpire),
		lastExpire: gt.time.eorzeaToLocal(spawnTimes.eExpire),
		mUp: this.mUp
	};

};

gt.timer.node.prototype.getSpawnTimes = function(eStart) {
	var eSpawn = new Date(eStart);
	eSpawn.setUTCDate(eSpawn.getUTCDate() - 2);
	eSpawn.setUTCMinutes(0);
	eSpawn.setUTCHours(0);
	eSpawn.setUTCSeconds(0);

	var eSpawnPrevious, eExpirePrevious;
	while (true) {
		for (var i = 0; i < this.node.time.length; i++) {
			eSpawn.setUTCHours(this.node.time[i]);
			var eExpire = new Date(eSpawn);
			eExpire.setUTCMinutes(this.node.uptime);

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
};

gt.timer.node.prototype.notify = function() {
	var stars = this.node.stars ? (' ' + gt.util.repeat('*', this.node.stars)) : '';
	var title = 'Lv. ' + this.node.lvl + stars + ' ' + this.title;
	var items = _.map(this.node.items, function(i) { return (i.slot ? '[' + i.slot + '] ' : '') + i.item; });
	var n = new window.Notification(title, {
		icon: this.icon,
		body: this.node.zone + ' ' + this.progress.time + '\r\n' + items.join(', '),
		tag: this.id
	});

	setTimeout(function() { n.close(); }, 45 * 1000);
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
	},

	removeOffset: function(offsetDate) {
		if (!gt.time.timeOffset)
			return offsetDate;

		var date = new Date(offsetDate);
		date.setTime(date.getTime() - gt.time.timeOffset);
		return date;
	}
};

// gt.skywatcher.js

gt.skywatcher = {
	weatherIndex: ["","쾌청","맑음","흐림","안개","바람","강풍","비","폭우","번개","뇌우","모래먼지","모래폭풍","열파","작열파","눈","눈보라","요마의 안개","오로라","어둠","투기","흐림","뇌운","파랑","파랑","먹구름","작열파","요마의 안개","강풍","분화","맑음","맑음","맑음","맑음","맑음","극광","용핵","용핵","용핵","용핵","떼구름","떼구름","떼구름","떼구름","신의 뜻","신의 뜻","신의 뜻","신의 뜻","신의 뜻","그림자바람","방전","연무","맑음","야수번개","천둥파동","야수번개"],
	zoneWeather: {"림사 로민사":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"중부 라노시아":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"저지 라노시아":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"동부 라노시아":[{"weather":4,"rate":5},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":7,"rate":95},{"weather":8,"rate":100}],"서부 라노시아":[{"weather":4,"rate":10},{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":80},{"weather":5,"rate":90},{"weather":6,"rate":100}],"고지 라노시아":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":9,"rate":90},{"weather":10,"rate":100}],"외지 라노시아":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":85},{"weather":7,"rate":100}],"안갯빛 마을":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"그리다니아 신시가지":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"그리다니아 구시가지":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"검은장막 숲 중부삼림":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"검은장막 숲 동부삼림":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"검은장막 숲 남부삼림":[{"weather":4,"rate":5},{"weather":10,"rate":10},{"weather":9,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],"검은장막 숲 북부삼림":[{"weather":4,"rate":5},{"weather":8,"rate":10},{"weather":7,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],"라벤더 안식처":[{"weather":3,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"울다하":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"서부 다날란":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"중부 다날란":[{"weather":11,"rate":15},{"weather":1,"rate":55},{"weather":2,"rate":75},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"동부 다날란":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":7,"rate":85},{"weather":8,"rate":100}],"남부 다날란":[{"weather":14,"rate":20},{"weather":1,"rate":60},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":4,"rate":100}],"북부 다날란":[{"weather":1,"rate":5},{"weather":2,"rate":20},{"weather":3,"rate":50},{"weather":4,"rate":100}],"하늘잔 마루":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"이슈가르드":[{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"커르다스 중앙고지":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"커르다스 서부고지":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"모르도나":[{"weather":3,"rate":15},{"weather":4,"rate":30},{"weather":17,"rate":60},{"weather":1,"rate":75},{"weather":2,"rate":100}],"아발라시아 구름바다":[{"weather":1,"rate":30},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":5,"rate":90},{"weather":49,"rate":100}],"아지스 라":[{"weather":2,"rate":35},{"weather":3,"rate":70},{"weather":9,"rate":100}],"고지 드라바니아":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":9,"rate":30},{"weather":11,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"저지 드라바니아":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"드라바니아 구름바다":[{"weather":3,"rate":10},{"weather":6,"rate":20},{"weather":50,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"Idyllshire":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}]},
/*	weatherIndex: ["","Clear Skies","Fair Skies","Clouds","Fog","Wind","Gales","Rain","Showers","Thunder","Thunderstorms","Dust Storms","Sandstorms","Hot Spells","Heat Waves","Snow","Blizzards","Gloom","Auroras","Darkness","Tension","Clouds","Storm Clouds","Rough Seas","Rough Seas","Louring","Heat Waves","Gloom","Gales","Eruptions","Fair Skies","Fair Skies","Fair Skies","Fair Skies","Fair Skies","Irradiance","Core Radiation","Core Radiation","Core Radiation","Core Radiation","떼구름","떼구름","떼구름","떼구름","신의 뜻","신의 뜻","신의 뜻","신의 뜻","신의 뜻","그림자바람","방전","연무","Fair Skies","야수번개","천둥파동","야수번개"],
	zoneWeather: {"Limsa Lominsa":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"Middle La Noscea":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"Lower La Noscea":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":5,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"Eastern La Noscea":[{"weather":4,"rate":5},{"weather":1,"rate":50},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":7,"rate":95},{"weather":8,"rate":100}],"Western La Noscea":[{"weather":4,"rate":10},{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":80},{"weather":5,"rate":90},{"weather":6,"rate":100}],"Upper La Noscea":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":9,"rate":90},{"weather":10,"rate":100}],"Outer La Noscea":[{"weather":1,"rate":30},{"weather":2,"rate":50},{"weather":3,"rate":70},{"weather":4,"rate":85},{"weather":7,"rate":100}],"Mist":[{"weather":3,"rate":20},{"weather":1,"rate":50},{"weather":2,"rate":70},{"weather":2,"rate":80},{"weather":4,"rate":90},{"weather":7,"rate":100}],"Gridania":[{"weather":7,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"Central Shroud":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"East Shroud":[{"weather":9,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"South Shroud":[{"weather":4,"rate":5},{"weather":10,"rate":10},{"weather":9,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],"North Shroud":[{"weather":4,"rate":5},{"weather":8,"rate":10},{"weather":7,"rate":25},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":70},{"weather":1,"rate":100}],"The Lavender Beds":[{"weather":3,"rate":5},{"weather":7,"rate":20},{"weather":4,"rate":30},{"weather":3,"rate":40},{"weather":2,"rate":55},{"weather":1,"rate":85},{"weather":2,"rate":100}],"Ul'dah":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"Western Thanalan":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"Central Thanalan":[{"weather":11,"rate":15},{"weather":1,"rate":55},{"weather":2,"rate":75},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"Eastern Thanalan":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":7,"rate":85},{"weather":8,"rate":100}],"Southern Thanalan":[{"weather":14,"rate":20},{"weather":1,"rate":60},{"weather":2,"rate":80},{"weather":3,"rate":90},{"weather":4,"rate":100}],"Northern Thanalan":[{"weather":1,"rate":5},{"weather":2,"rate":20},{"weather":3,"rate":50},{"weather":4,"rate":100}],"The Goblet":[{"weather":1,"rate":40},{"weather":2,"rate":60},{"weather":3,"rate":85},{"weather":4,"rate":95},{"weather":7,"rate":100}],"Ishgard":[{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"Coerthas Central Highlands":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"Coerthas Western Highlands":[{"weather":16,"rate":20},{"weather":15,"rate":60},{"weather":2,"rate":70},{"weather":1,"rate":75},{"weather":3,"rate":90},{"weather":4,"rate":100}],"Mor Dhona":[{"weather":3,"rate":15},{"weather":4,"rate":30},{"weather":17,"rate":60},{"weather":1,"rate":75},{"weather":2,"rate":100}],"The Sea of Clouds":[{"weather":1,"rate":30},{"weather":2,"rate":60},{"weather":3,"rate":70},{"weather":4,"rate":80},{"weather":5,"rate":90},{"weather":49,"rate":100}],"Azys Lla":[{"weather":2,"rate":35},{"weather":3,"rate":70},{"weather":9,"rate":100}],"The Dravanian Forelands":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":9,"rate":30},{"weather":11,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"The Dravanian Hinterlands":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"The Churning Mists":[{"weather":3,"rate":10},{"weather":6,"rate":20},{"weather":50,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}],"Idyllshire":[{"weather":3,"rate":10},{"weather":4,"rate":20},{"weather":7,"rate":30},{"weather":8,"rate":40},{"weather":1,"rate":70},{"weather":2,"rate":100}]},
*/
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

// gt.timeline.js

gt.timeline = {
	addSlot: function(timeslots, active, timer) {
		// Fit an icon into this timeslot.
		var activeSeconds = (active.getUTCHours() * 3600) + (active.getUTCMinutes() * 60) + active.getUTCSeconds();
		var slot = timeslots[activeSeconds];
		if (!slot)
			timeslots[activeSeconds] = slot = [];

		slot.push('<img src="' + timer.icon + '" title="' + timer.tooltip + '">');
	},

	render: function() {
		// Render a 24 Eorzea-hour period (70 minutes)
		var now = gt.time.eCurrentTime();
		var end = new Date(now);
		end.setUTCMinutes(0);
		end.setUTCSeconds(1);
		end.setUTCHours(24);
		var end2 = new Date(now);
		end2.setUTCHours(end2.getUTCHours() + 24);

		// Find the items to generate a timeline for.
		var items = [];
		for (var i = 0; i < gt.bell.settings.lists.length; i++) {
			var list = gt.bell.settings.lists[i];
			if (!list.active)
				continue;

			var isotope = gt.isotope[list.id];
			for (var ii = 0; ii < isotope.filteredItems.length; ii++)
				items.push(isotope.filteredItems[ii]);
		}

		// Generate timeslots.
		var timeslots = {};
		var activeItems = {};
		var timers = _.map(items, function(i) { return $(i.element).data('view'); });
		for (var i = 0; i < timers.length; i++) {
			var timer = timers[i];
			var active = gt.time.localToEorzea(timer.period.active);
			if (active > end && active > end2)
				continue;

			if (activeItems[timer.id])
				continue;
			else
				activeItems[timer.id] = 1;

			gt.timeline.addSlot(timeslots, active, timer);

			if (timer.lastPeriod) {
				var lastActive = gt.time.localToEorzea(timer.lastPeriod.active);
				if (lastActive.getUTCHours() == active.getUTCHours())
					continue; // Don't log to the same slot.

				if (lastActive > end && lastActive > end2)
					continue;

				gt.timeline.addSlot(timeslots, lastActive, timer);

			}
		}

		// Display all the slots.
		var max = 0;
		var $timeslots = $('#timeslots');
		$timeslots.empty();
		for (var activeSeconds in timeslots) {
			var images = timeslots[activeSeconds];
			max = Math.max(max, images.length);
			var activePercent = (activeSeconds / (24 * 60 * 60)) * 100;
			var $slot = $('<div class="slot" style="left: ' + activePercent + '%"></div>');
			$slot.append(images);
			$timeslots.append($slot);
		}

		max = Math.min(max, 5); // Cap at 5.
		$timeslots.css('height', (8 + (30 * max)) + 'px');

		// Render hours
		var $hours = $('#timeline .hours');
		$hours.empty();
		for (var h = 0; h < 24; h++) {
			var percent = (h / 24) * 100;
			var formatted = h;
			if (!gt.bell.is24Hour) {
				var hour = h == 0 ? 24 : h;
				formatted = ((hour - 1) % 12 + 1);
				if (formatted == 12)
					formatted += (hour > 11 && hour < 24 ? 'P' : 'A');
			}
			var $hour = $('<span class="hour" style="left: ' + percent + '%">' + formatted + '</span>');
			$hours.append($hour);
		}
	},

	tick: function(now) {
		var seconds = (now.getUTCHours() * 3600) + (now.getUTCMinutes() * 60) + now.getUTCSeconds();
		var percent = (seconds / (24 * 60 * 60)) * 100;
		$('#timeline .hand').css('left', percent + '%');

		// Rerender at the start of the day to catch new stuff.
		if (seconds <= 21)
			gt.timeline.render();
	}
};

// gt.map.js

gt.map = {
	dragOriginX: 0,
	dragOriginY: 0,
	dragging: null,
	pixelsPerGrid: 50,
	canvasSize: 381,
	canvasScale: 381 / 2048,
	stateFillStyles: {
		active: 'rgba(60, 99, 60, 0.7)',
		spawning: 'rgba(150, 72, 51, 0.7)'
	},

	setup: function ($wrapper) {
		var $container = $('.map-container', $wrapper);
		if (!$container.length)
			return;

		var view = $wrapper.data('view');
		var location = view.location;
		var size = gt.map.pixelsPerGrid * location.size * gt.map.canvasScale;

		if (!gt.isTouchDevice) {
			// Dragging, at least, works fine with touch by default.
			//$container.bind('wheel', gt.map.wheel);

			//$container.bind('mousedown', gt.map.dragDown);
			$container.bind('mousemove', gt.map.mousemove);
			$container.bind('mouseout', gt.map.mouseout);
		}

		$container.data('location', location);

		// Paint the image
		var $base = $('canvas.base', $container);

		gt.cache.whenImages([view.image]).done(function() {
			var image = gt.cache.images[view.image];

			// Draw base map image.
			var baseContext = $base[0].getContext('2d');
			baseContext.drawImage(image, 0, 0, gt.map.canvasSize, gt.map.canvasSize);

			// Draw grid tiles.
			baseContext.beginPath();
			baseContext.strokeStyle = 'rgba(50, 50, 50, 0.05)';
			for (var i = 0; i < gt.map.canvasSize; i += size) {
				for (var ii = 0; ii < gt.map.canvasSize; ii += size)
					baseContext.strokeRect(i, ii, size, size);
			}
			baseContext.closePath();

			gt.map.renderPoints($container, view);
		});
	},

	renderPoints: function($container, view) {
		var pointScale = 4;

		var points = view.points;
		var size = gt.map.pixelsPerGrid * view.location.size;
		var iconSize = size * pointScale * gt.map.canvasScale;

		var $points = $('canvas.points', $container);
		var pointContext = $points[0].getContext('2d');

		var imageSources = _.map(view.points, function(p) { return p.icon; });

		gt.display.paintItemsWithoutBackground(imageSources).done(function() {
			for (var i = 0; i < view.points.length; i++) {
				var p = view.points[i];
				var img = gt.cache.imagesWithoutBackground[p.icon];
				var state = p.origin.progress.state;

				if (state != 'dormant') {
					var adj = (iconSize / 2) - 12;
					pointContext.beginPath();
					pointContext.arc(p.x + adj, p.y + adj, p.r * pointScale * gt.map.canvasScale * 1.2, 0, Math.PI * 2, false);
					pointContext.fillStyle = gt.map.stateFillStyles[state];
					pointContext.fill();
					pointContext.closePath();
				}

				pointContext.drawImage(img, p.x - (size / pointScale), p.y - (size / pointScale), iconSize, iconSize);
			}
		});
	},

	getViewModel: function(zoneName, coords, radius) {
		var location_kr = _.find(_.values(gt.location.indexkr), function(l) { return l.name == zoneName; });
		if (!location_kr || !location_kr.parentId)
			return null;
		var location = _.find(_.values(gt.location.index), function(l) { return l.id == location_kr.id; });
		var view = {
			location: location_kr,
			parent: gt.location.index[location.parentId],
			displayCoords: coords
		};

		var offset = 1;
		var x = (coords[0] - offset) * gt.map.pixelsPerGrid * location.size * gt.map.canvasScale;
		var y = (coords[1] - offset) * gt.map.pixelsPerGrid * location.size * gt.map.canvasScale;
		view.coords = [x, y];

		if (radius)
			view.radius = gt.map.toMapCoordinate(radius, location.size) * Math.PI * 2;
		else {
			view.radius = gt.map.pixelsPerGrid / 2;
			view.radius *= location.size;
		}

		view.image = 'http://www.garlandtools.org/db/maps/' + view.parent.name + '/' + gt.map.sanitizeLocationName(location.name) + '.png';

		return view;
	},

	sanitizeLocationName: function(name) {
		if (name.indexOf('The Diadem') == 0)
			return 'The Diadem';
		else
			return name;
	},

	toMapCoordinate: function(value, size) {
		return ((50 / size) * ((value * size) / 2048));
	},

	getGridPosition: function(e, mapContainer) {
		var x = e.offsetX + mapContainer.scrollLeft;
		var y = e.offsetY + mapContainer.scrollTop;

		var zoom = Number($('.map', mapContainer).css('zoom') || 1);

		var location = $(mapContainer).data('location');
		var mapX = (x / (gt.map.pixelsPerGrid * zoom)) / location.size;
		var mapY = (y / (gt.map.pixelsPerGrid * zoom)) / location.size;
		return {x: mapX, y: mapY};
	},

	getAbsolutePosition: function(pos, mapContainer) {
		var location = $(mapContainer).data('location');
		var pixelsPerGrid = gt.map.pixelsPerGrid * Number($('.map', mapContainer).css('zoom') || 1);
		var scrollX = pos.x * pixelsPerGrid * location.size;
		var scrollY = pos.y * pixelsPerGrid * location.size;
		return {x: scrollX, y: scrollY};
	},

	mousemove: function(e) {
		var pos = gt.map.getGridPosition(e, this);
		pos.x /= gt.map.canvasScale;
		pos.y /= gt.map.canvasScale;
		$('.position', this).text(parseInt(pos.x + 1) + ", " + parseInt(pos.y + 1));
	},

	wheel: function(e) {
		e.stopPropagation();
		e = e.originalEvent;

		var gridPos = gt.map.getGridPosition(e, this);

		var delta = gt.display.normalizeWheelDelta(e.deltaY) * .0015;

		var $map = $('.map', this);
		var currentZoom = Number($map.css('zoom') || 1);
		var zoom = Math.min(Math.max(currentZoom - delta, 0.1857), 1.75);

		$map.css('zoom', zoom);

		// Zooming shifts location.  Readjust scrollbar to account for changes.
		var absolutePos = gt.map.getAbsolutePosition(gridPos, this);
		this.scrollLeft = absolutePos.x - e.offsetX;
		this.scrollTop = absolutePos.y - e.offsetY;

		return false;
	},

	mouseout: function(e) {
		// Reset coords when moving the mouse out of the map.
		var $position = $('.position', this);
		$position.empty();
	},

	dragDown: function(e) {
		gt.map.dragOriginX = e.pageX;
		gt.map.dragOriginY = e.pageY;
		gt.map.dragging = this;

		$('html')
			.bind('mouseup touchend', gt.map.dragUp)
			.bind('mousemove touchmove', gt.map.dragMove);

		$(this).addClass('dragging');
	},

	dragUp: function(e) {
		$('html')
			.unbind('mouseup')
			.unbind('mousemove')
			.unbind('touchup')
			.unbind('touchmove');

		$('.dragging').removeClass('dragging');

		gt.map.dragOriginX = 0;
		gt.map.dragOriginY = 0;
		gt.map.dragging = null;
	},

	dragMove: function(e) {
		var x = e.pageX;
		var y = e.pageY;

		var maxDelta = 15;
		var acceleration = 1.15;
		xDelta = Math.min(Math.max(gt.map.dragOriginX - x, -maxDelta), maxDelta) * acceleration;
		yDelta = Math.min(Math.max(gt.map.dragOriginY - y, -maxDelta), maxDelta) * acceleration;

		if (xDelta > 1 || xDelta < 1)
			gt.map.dragging.scrollLeft += xDelta;

		if (yDelta > 1 || yDelta < 1)
			gt.map.dragging.scrollTop += yDelta;

		gt.map.dragOriginX = x;
		gt.map.dragOriginY = y;

		return false;
	},

	render: function() {
		if (!gt.bell.settings.maps)
			return;

		// Collect map data.
		var zoneMaps = {};
		var lists = gt.bell.settings.lists;
		for (var i = 0; i < lists.length; i++) {
			var list = lists[i];
			if (!list.active)
				continue;

			var isotope = gt.isotope[list.id];

			for (var ii = 0; ii < isotope.filteredItems.length; ii++) {
				var $element = $(isotope.filteredItems[ii].element);
				var view = $element.data('view');
				if (!view.map)
					continue;

				var mapView = zoneMaps[view.map.location.name];
				if (!mapView) {
					mapView = zoneMaps[view.map.location.name] = {
						points: [],
						location: view.map.location,
						image: view.map.image
					};
				}

				mapView.points.push({
					x: view.map.coords[0], y: view.map.coords[1],
					dx: view.map.displayCoords[0], dy: view.map.displayCoords[1],
					r: view.map.radius, icon: view.icon,
					origin: view
				});
			}
		}

		// Display the maps
		var sortedMapKeys = _.keys(zoneMaps).sort();
		var $maps = $('#maps').empty();
		for (var i = 0; i < sortedMapKeys.length; i++) {
			var mapView = zoneMaps[sortedMapKeys[i]];
			mapView.displayCoords = _.map(mapView.points, function(p) { return p.dx + ", " + p.dy }).join("<br/>");

			var $map = $(gt.bell.mapTemplate(mapView));
			$map.data('view', mapView);
			$maps.append($map);
			gt.map.setup($map);
		}
	}
};

// gt.display.js

gt.display = {
    normalizeWheelDelta: function(d) {
        var min = 50;

        if (d < 0 && d > -min)
            return -min;
        else if (d > 0 && d < min)
            return min;
        return d;
    },

    paintItemsWithoutBackground: function(set) {
		set.push('./images/Blank Item Backdrop.png');
		var completed = $.Deferred();

		gt.cache.whenImages(set).done(function() {
			var blankImg = gt.cache.images['./images/Blank Item Backdrop.png'];
			var loads = [];

			for (var i = 0; i < set.length; i++) {
				if (i == set.length - 1)
					break; // Don't do the backdrop.

				var src = set[i];

				var image = gt.cache.imagesWithoutBackground[src];
				if (image)
					loads.push(image.deferred);
				else {
					var load = $.Deferred();

					var newImage = new Image();
					newImage.deferred = load;
					gt.cache.imagesWithoutBackground[src] = newImage;

					newImage.onload = function() { this.deferred.resolve(this); };
					newImage.src = gt.display.paintItemWithoutBackground(blankImg, gt.cache.images[src], 128);
					loads.push(load);
				}
			}

			$.when.apply($, loads).done(function() { completed.resolve(); });
		});

		return completed;
    },

    paintItemWithoutBackground: function(blankImg, itemImg, size) {
		var canvas = document.createElement('canvas');
		canvas.height = size * 2;
		canvas.width = size * 2;
		var context = canvas.getContext('2d');

		context.drawImage(blankImg, size, size, size, size);
		var blankPixels = context.getImageData(size, size, size, size);
		var blankData = blankPixels.data;

		context.drawImage(itemImg, 0, 0, size, size);
		var itemPixels = context.getImageData(0, 0, size, size);
		var itemData = itemPixels.data;

		for (var i = 0; i < itemData.length; i += 4) {
			// Skip already transparent pixels.
			if (itemData[i+3] == 0)
				continue;

			// Generate a difference score.
			var diff = 0;
			for (var ii = 0; ii < 3; ii++)
				diff += Math.abs(itemData[i+ii] - blankData[i+ii]);

			// Make this pixel transparent if the difference is not over our threshold.
			if (diff < 15)
				itemData[i+3] = 0;
		}

		canvas.height = size;
		canvas.width = size;
		context.clearRect(0, 0, size, size);
		context.putImageData(itemPixels, 0, 0);

		return canvas.toDataURL();
    }
};

// gt.cache.js

gt.cache = {
	images: {},
	imagesWithoutBackground: {},

	whenImages: function(set) {
		var loads = [];

		for (var i = 0; i < set.length; i++) {
			var src = set[i];
			var image = gt.cache.images[src];
			if (image)
				loads.push(image.deferred);
			else {
				var load = $.Deferred();

				var newImage = new Image();
				newImage.deferred = load;
				gt.cache.images[src] = newImage;

				newImage.onload = function() { this.deferred.resolve(this); };
				newImage.src = src;
				loads.push(load);
			} 
		}

		return $.when.apply($, loads);
	}
}

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

	sanitize: function(str) {
		return str.replace(/[\s'\?\(\)]/g, '');
	}
};

// gt.data.core.js

gt.location = { };
gt.location.index = {"-1":{"id":-1,"name":"The Diadem (Easy)","weatherRate":60,"parentId":497,"size":1},"-2":{"id":-2,"name":"The Diadem","weatherRate":61,"parentId":497,"size":1},"-3":{"id":-3,"name":"The Diadem (Hard)","weatherRate":62,"parentId":497,"size":1},"21":{"id":21,"name":"Eorzea","parentId":21,"size":1.0},"22":{"id":22,"name":"La Noscea","parentId":22,"size":1.0},"23":{"id":23,"name":"The Black Shroud","parentId":23,"size":1.0},"24":{"id":24,"name":"Thanalan","parentId":24,"size":1.0},"25":{"id":25,"name":"Coerthas","parentId":25,"size":1.0},"26":{"id":26,"name":"Mor Dhona","parentId":26,"size":1.0},"27":{"id":27,"name":"Limsa Lominsa","parentId":22,"weatherRate":14},"28":{"id":28,"name":"Limsa Lominsa Upper Decks","parentId":22,"size":2.0,"weatherRate":14},"29":{"id":29,"name":"Limsa Lominsa Lower Decks","parentId":22,"size":2.0,"weatherRate":15},"30":{"id":30,"name":"Middle La Noscea","parentId":22,"size":1.0,"weatherRate":16},"31":{"id":31,"name":"Lower La Noscea","parentId":22,"size":1.0,"weatherRate":17},"32":{"id":32,"name":"Eastern La Noscea","parentId":22,"size":1.0,"weatherRate":18},"33":{"id":33,"name":"Western La Noscea","parentId":22,"size":1.0,"weatherRate":19},"34":{"id":34,"name":"Upper La Noscea","parentId":22,"size":1.0,"weatherRate":20},"35":{"id":35,"name":"Sastasha","parentId":22,"size":2.0},"36":{"id":36,"name":"Brayflox's Longstop","parentId":22,"size":2.0},"37":{"id":37,"name":"The Wanderer's Palace","parentId":22,"size":2.0},"39":{"id":39,"name":"Gridania","parentId":23,"weatherRate":1},"40":{"id":40,"name":"Ul'dah - Steps of Nald","parentId":24,"size":2.0,"weatherRate":7},"41":{"id":41,"name":"Ul'dah - Steps of Thal - Merchant Strip","parentId":24,"size":2.0,"weatherRate":8},"42":{"id":42,"name":"Western Thanalan","parentId":24,"size":1.0,"weatherRate":9},"43":{"id":43,"name":"Central Thanalan","parentId":24,"size":1.0,"weatherRate":10},"44":{"id":44,"name":"Eastern Thanalan","parentId":24,"size":1.0,"weatherRate":11},"45":{"id":45,"name":"Southern Thanalan","parentId":24,"size":1.0,"weatherRate":12},"46":{"id":46,"name":"Northern Thanalan","parentId":24,"size":1.0,"weatherRate":13},"47":{"id":47,"name":"Cutter's Cry - The Dry Sands","parentId":24,"size":2.0},"48":{"id":48,"name":"Copperbell Mines - Ground Level","parentId":24,"size":2.0},"49":{"id":49,"name":"Halatali","parentId":24,"size":2.0},"50":{"id":50,"name":"The Sunken Temple of Qarn - Sanctum Entrance","parentId":24,"size":2.0},"51":{"id":51,"name":"Ul'dah","parentId":24,"weatherRate":7},"52":{"id":52,"name":"New Gridania","parentId":23,"size":2.0,"weatherRate":1},"53":{"id":53,"name":"Old Gridania","parentId":23,"size":2.0,"weatherRate":2},"54":{"id":54,"name":"Central Shroud","parentId":23,"size":1.0,"weatherRate":3},"55":{"id":55,"name":"East Shroud","parentId":23,"size":1.0,"weatherRate":4},"56":{"id":56,"name":"South Shroud","parentId":23,"size":1.0,"weatherRate":5},"57":{"id":57,"name":"North Shroud","parentId":23,"size":1.0,"weatherRate":6},"58":{"id":58,"name":"The Tam-Tara Deepcroft","parentId":23,"size":3.0},"59":{"id":59,"name":"Haukke Manor - Ground Floor","parentId":23,"size":2.0},"61":{"id":61,"name":"The Thousand Maws of Toto-Rak","parentId":23,"size":2.0},"62":{"id":62,"name":"Ishgard","parentId":25,"size":2.0,"weatherRate":47},"63":{"id":63,"name":"Coerthas Central Highlands","parentId":25,"size":1.0,"weatherRate":21},"64":{"id":64,"name":"Dzemael Darkhold - Outer Hold","parentId":25,"size":2.0},"65":{"id":65,"name":"Aurum Vale","parentId":25,"size":2.0},"67":{"id":67,"name":"Mor Dhona","parentId":26,"size":1.0,"weatherRate":22},"68":{"id":68,"name":"Jadeite Thick"},"69":{"id":69,"name":"Greentear"},"70":{"id":70,"name":"Bentbranch"},"71":{"id":71,"name":"Sorrel Haven"},"73":{"id":73,"name":"The Honey Yard"},"74":{"id":74,"name":"Nine Ivies"},"75":{"id":75,"name":"The Bramble Patch"},"78":{"id":78,"name":"Upper Paths"},"79":{"id":79,"name":"Lower Paths"},"81":{"id":81,"name":"Silent Arbor"},"82":{"id":82,"name":"Urth's Gift"},"83":{"id":83,"name":"Treespeak"},"84":{"id":84,"name":"Peacegarden"},"85":{"id":85,"name":"Alder Springs"},"86":{"id":86,"name":"Proud Creek"},"90":{"id":90,"name":"The Bannock"},"92":{"id":92,"name":"Naked Rock"},"94":{"id":94,"name":"Bentbranch Meadows"},"101":{"id":101,"name":"Everschade"},"104":{"id":104,"name":"Hopeseed Pond"},"107":{"id":107,"name":"The Hawthorne Hut"},"112":{"id":112,"name":"Sanctum of the Twelve","parentId":23,"size":2.0,"weatherRate":4},"113":{"id":113,"name":"Little Solace"},"123":{"id":123,"name":"Camp Tranquil"},"125":{"id":125,"name":"The Lost City of Amdapor - Central Amdapor","parentId":23,"size":2.0,"weatherRate":40},"126":{"id":126,"name":"Rootslake"},"128":{"id":128,"name":"Amdapor Keep","parentId":23,"size":2.0,"weatherRate":28},"129":{"id":129,"name":"Quarrymill"},"144":{"id":144,"name":"Gelmorra Ruins"},"154":{"id":154,"name":"The Fold","parentId":22,"size":4.0,"weatherRate":29},"155":{"id":155,"name":"Sweetbloom Pier"},"161":{"id":161,"name":"Zephyr Drift"},"162":{"id":162,"name":"Summerford"},"163":{"id":163,"name":"Three-malm Bend"},"164":{"id":164,"name":"Moraby Bay"},"165":{"id":165,"name":"Cedarwood"},"166":{"id":166,"name":"The Gods' Grip"},"167":{"id":167,"name":"Bloodshore"},"168":{"id":168,"name":"Raincatcher Gully"},"170":{"id":170,"name":"Quarterstone"},"171":{"id":171,"name":"Skull Valley"},"174":{"id":174,"name":"Oakwood"},"177":{"id":177,"name":"Bronze Lake"},"182":{"id":182,"name":"Rogue River"},"192":{"id":192,"name":"Woad Whisper Canyon"},"193":{"id":193,"name":"Nym River"},"197":{"id":197,"name":"The Mourning Widow"},"200":{"id":200,"name":"Red Rooster Stead"},"202":{"id":202,"name":"Blind Iron Mines"},"206":{"id":206,"name":"Costa del Sol"},"211":{"id":211,"name":"Hidden Falls"},"214":{"id":214,"name":"Red Mantis Falls"},"216":{"id":216,"name":"Wineport"},"218":{"id":218,"name":"Swiftperch"},"220":{"id":220,"name":"The Brewer's Beacon"},"223":{"id":223,"name":"Aleport"},"228":{"id":228,"name":"The Ship Graveyard"},"230":{"id":230,"name":"Pharos Sirius - Flood Cellar","parentId":22,"size":2.0,"weatherRate":28},"234":{"id":234,"name":"Fool Falls"},"243":{"id":243,"name":"Hammerlea"},"244":{"id":244,"name":"Horizon's Edge"},"245":{"id":245,"name":"The Footfalls"},"246":{"id":246,"name":"Cape Westwind"},"247":{"id":247,"name":"Spineless Basin"},"248":{"id":248,"name":"Black Brush"},"249":{"id":249,"name":"The Clutch"},"250":{"id":250,"name":"Drybone"},"251":{"id":251,"name":"Sandgate"},"252":{"id":252,"name":"Wellwick Wood"},"253":{"id":253,"name":"The Burning Wall"},"254":{"id":254,"name":"Broken Water"},"255":{"id":255,"name":"Southern Thanalan - Zanr'ak","parentId":24,"size":1.0,"weatherRate":12},"256":{"id":256,"name":"The Red Labyrinth"},"257":{"id":257,"name":"Sagolii Desert"},"258":{"id":258,"name":"Bluefog"},"259":{"id":259,"name":"Raubahn's Push"},"260":{"id":260,"name":"Castrum Meridianum","parentId":24,"size":2.0},"263":{"id":263,"name":"Scorpion Crossing"},"264":{"id":264,"name":"Nophica's Wells"},"266":{"id":266,"name":"The Silver Bazaar"},"271":{"id":271,"name":"Horizon"},"272":{"id":272,"name":"Crescent Cove"},"274":{"id":274,"name":"Vesper Bay"},"275":{"id":275,"name":"Moondrip"},"276":{"id":276,"name":"Parata's Peace"},"294":{"id":294,"name":"Lost Hope"},"297":{"id":297,"name":"The Unholy Heir"},"300":{"id":300,"name":"Camp Drybone"},"308":{"id":308,"name":"Yugr'am River"},"310":{"id":310,"name":"Burgundy Falls"},"313":{"id":313,"name":"Little Ala Mhigo"},"314":{"id":314,"name":"Burnt Lizard Creek"},"323":{"id":323,"name":"Forgotten Springs"},"325":{"id":325,"name":"Camp Bluefog"},"330":{"id":330,"name":"Ceruleum Field"},"337":{"id":337,"name":"Moraby Drydocks"},"338":{"id":338,"name":"The Salt Strand"},"339":{"id":339,"name":"Candlekeep Quay"},"340":{"id":340,"name":"Empty Heart"},"341":{"id":341,"name":"Oschon's Torch"},"346":{"id":346,"name":"Seat of the First Bow","parentId":23,"size":8.0},"347":{"id":347,"name":"Lotus Stand","parentId":23,"size":4.0},"350":{"id":350,"name":"Outer La Noscea","parentId":22,"size":1.0,"weatherRate":24},"351":{"id":351,"name":"Command Room","parentId":22,"size":8.0,"weatherRate":14},"354":{"id":354,"name":"Heart of the Sworn","parentId":24,"size":4.0},"356":{"id":356,"name":"The Waking Sands","parentId":24,"size":4.0},"357":{"id":357,"name":"Bowl of Embers","parentId":24,"size":4.0,"weatherRate":25},"358":{"id":358,"name":"Wolves' Den Pier","parentId":22,"size":4.0,"weatherRate":29},"359":{"id":359,"name":"The Navel","parentId":22,"size":4.0,"weatherRate":23},"360":{"id":360,"name":"Thornmarch","parentId":23,"size":4.0,"weatherRate":30},"361":{"id":361,"name":"The Howling Eye","parentId":25,"size":4.0,"weatherRate":26},"363":{"id":363,"name":"Sapsa Spawning Grounds"},"365":{"id":365,"name":"Reaver Hide"},"373":{"id":373,"name":"Ul'dah - Steps of Thal - Merchant Strip","parentId":24,"size":2.0,"weatherRate":8},"380":{"id":380,"name":"Dragonhead"},"381":{"id":381,"name":"Providence Point"},"383":{"id":383,"name":"Whitebrim"},"384":{"id":384,"name":"Haldrath's March"},"385":{"id":385,"name":"Observatorium"},"386":{"id":386,"name":"Griffin Crossing","parentId":25,"size":2.0},"389":{"id":389,"name":"Witchdrop"},"392":{"id":392,"name":"The Weeping Saint"},"398":{"id":398,"name":"Daniffen Pass"},"401":{"id":401,"name":"Stone Vigil","parentId":25,"size":2.0,"weatherRate":27},"402":{"id":402,"name":"Whitebrim Front"},"404":{"id":404,"name":"Snowcloak","parentId":25,"size":2.0},"406":{"id":406,"name":"Steps of Faith","parentId":25,"size":2.0,"weatherRate":28},"410":{"id":410,"name":"North Silvertear"},"413":{"id":413,"name":"The Tangle"},"414":{"id":414,"name":"Rathefrost"},"416":{"id":416,"name":"Saint Coinach's Find"},"417":{"id":417,"name":"Singing Shards"},"418":{"id":418,"name":"The Keeper of the Lake - Forecastle","parentId":26,"size":2.0},"425":{"id":425,"name":"Mist","parentId":22,"size":2.0,"weatherRate":32},"426":{"id":426,"name":"The Lavender Beds","parentId":23,"size":2.0,"weatherRate":34},"427":{"id":427,"name":"The Goblet","parentId":24,"size":2.0,"weatherRate":33},"430":{"id":430,"name":"Praetorium"},"459":{"id":459,"name":"The Howling Eye","parentId":25,"size":4.0,"weatherRate":26},"464":{"id":464,"name":"Upper Aetheroacoustic Exploratory Site","parentId":22,"size":2.0},"465":{"id":465,"name":"Lower Aetheroacoustic Exploratory Site","parentId":22,"size":2.0},"466":{"id":466,"name":"The Ragnarok - Engine Room","parentId":22,"size":2.0},"467":{"id":467,"name":"Ragnarok Drive Cylinder","parentId":22,"size":2.0},"468":{"id":468,"name":"Ragnarok Central Core","parentId":22,"size":2.0},"477":{"id":477,"name":"Porta Decumana","parentId":24,"size":4.0,"weatherRate":31},"478":{"id":478,"name":"Labyrinth of the Ancients - Lower Labyrinth","parentId":26,"size":2.0},"481":{"id":481,"name":"The Rising Stones","parentId":26,"size":4.0},"493":{"id":493,"name":"Syrcus Tower - First Lower Ring","parentId":26,"size":2.0},"496":{"id":496,"name":"Seal Rock","parentId":22,"size":1.0,"weatherRate":59},"497":{"id":497,"name":"Abalathia's Spine","parentId":497,"size":1.0},"498":{"id":498,"name":"Dravania","parentId":498,"size":1.0},"654":{"id":654,"name":"Ul'dah - Steps of Nald - Airship Landing","parentId":24,"size":2.0,"weatherRate":7},"694":{"id":694,"name":"Hall of the Bestiarii"},"698":{"id":698,"name":"Ul'dah - Steps of Thal - Hustings Strip","parentId":24,"size":2.0,"weatherRate":8},"725":{"id":725,"name":"Limsa Lominsa Upper Decks - Airship Landing","parentId":22,"size":2.0,"weatherRate":14},"951":{"id":951,"name":"The Vein"},"952":{"id":952,"name":"The Mirror"},"953":{"id":953,"name":"Verdant Drop"},"954":{"id":954,"name":"Springripple Brook"},"955":{"id":955,"name":"Sylphlands"},"956":{"id":956,"name":"Upper Hathoeva River"},"957":{"id":957,"name":"Middle Hathoeva River"},"958":{"id":958,"name":"Lower Hathoeva River"},"959":{"id":959,"name":"East Hathoeva River"},"960":{"id":960,"name":"Goblinblood"},"961":{"id":961,"name":"Murmur Rills"},"962":{"id":962,"name":"Fallgourd Float"},"963":{"id":963,"name":"Lake Tahtotl"},"964":{"id":964,"name":"Jadeite Flood"},"965":{"id":965,"name":"Lower Black Tea Brook"},"966":{"id":966,"name":"The Deep Tangle"},"967":{"id":967,"name":"The North Shards"},"968":{"id":968,"name":"Coerthas River"},"969":{"id":969,"name":"The Nail"},"970":{"id":970,"name":"Dragonhead Latrines"},"971":{"id":971,"name":"Exploratory Ice Hole"},"972":{"id":972,"name":"Sea of Clouds"},"973":{"id":973,"name":"Zephyr Drift"},"974":{"id":974,"name":"Summerford"},"975":{"id":975,"name":"West Agelyss River"},"976":{"id":976,"name":"Moraby Bay"},"977":{"id":977,"name":"Cedarwood"},"978":{"id":978,"name":"South Bloodshore"},"979":{"id":979,"name":"North Bloodshore"},"980":{"id":980,"name":"East Agelyss River"},"981":{"id":981,"name":"The Juggernaut"},"982":{"id":982,"name":"Skull Valley"},"983":{"id":983,"name":"Halfstone"},"984":{"id":984,"name":"Isles of Umbra Northshore"},"985":{"id":985,"name":"Isles of Umbra Southshore"},"987":{"id":987,"name":"North Bronze Lake"},"988":{"id":988,"name":"Bronze Lake Shallows"},"989":{"id":989,"name":"The Long Climb"},"990":{"id":990,"name":"Upper Soot Creek"},"991":{"id":991,"name":"Lower Soot Creek"},"992":{"id":992,"name":"North Drybone"},"993":{"id":993,"name":"South Drybone"},"995":{"id":995,"name":"Zahar'ak"},"996":{"id":996,"name":"Sagolii Desert"},"997":{"id":997,"name":"Sagolii Dunes"},"998":{"id":998,"name":"Bluefog"},"999":{"id":999,"name":"Upper Black Tea Brook"},"1000":{"id":1000,"name":"Whispering Gorge"},"1001":{"id":1001,"name":"Rhotano Sea (Privateer Forecastle)"},"1002":{"id":1002,"name":"Rhotano Sea (Privateer Sterncastle)"},"1003":{"id":1003,"name":"Unfrozen Pond"},"1004":{"id":1004,"name":"Clearpool"},"1005":{"id":1005,"name":"South Banepool"},"1006":{"id":1006,"name":"West Banepool"},"1007":{"id":1007,"name":"West Mourn"},"1008":{"id":1008,"name":"Upper Thaliak River"},"1009":{"id":1009,"name":"Middle Thaliak River"},"1010":{"id":1010,"name":"Sohm Al Summit"},"1011":{"id":1011,"name":"Aetherochemical Spill"},"1161":{"id":1161,"name":"Mist","parentId":22,"size":2.0,"weatherRate":32},"1162":{"id":1162,"name":"Mist - Mist Subdivision","parentId":22,"size":2.0,"weatherRate":32},"1163":{"id":1163,"name":"The Goblet","parentId":24,"size":2.0,"weatherRate":33},"1164":{"id":1164,"name":"The Goblet - The Goblet Subdivision","parentId":24,"size":2.0,"weatherRate":33},"1165":{"id":1165,"name":"The Lavender Beds","parentId":23,"size":2.0,"weatherRate":34},"1166":{"id":1166,"name":"The Lavender Beds - The Lavender Beds Subdivision","parentId":23,"size":2.0,"weatherRate":34},"1301":{"id":1301,"name":"Dalamud's Shadow","parentId":23,"size":2.0},"1302":{"id":1302,"name":"The Outer Coil - Incubation Bay","parentId":23,"size":2.0,"weatherRate":28},"1303":{"id":1303,"name":"Central Decks - Lower Decks","parentId":23,"size":2.0},"1304":{"id":1304,"name":"The Holocharts","parentId":23,"size":2.0},"1334":{"id":1334,"name":"The Whorleater","parentId":22,"size":4.0,"weatherRate":38},"1363":{"id":1363,"name":"The Striking Tree","parentId":23,"size":4.0,"weatherRate":43},"1374":{"id":1374,"name":"Carteneau Flats: Borderland Ruins","parentId":26,"size":1.0},"1377":{"id":1377,"name":"Hullbreaker Isle","parentId":22,"size":2.0},"1390":{"id":1390,"name":"The Chrysalis","parentId":26,"size":4.0},"1399":{"id":1399,"name":"Akh Afah Amphitheatre","parentId":25,"size":4.0,"weatherRate":46},"1406":{"id":1406,"name":"IC-06 Central Decks","parentId":24,"size":2.0},"1407":{"id":1407,"name":"IC-06 Regeneration Grid","parentId":24,"size":2.0},"1408":{"id":1408,"name":"IC-06 Main Bridge","parentId":24,"size":2.0},"1409":{"id":1409,"name":"The Burning Heart","parentId":24,"size":2.0,"weatherRate":44},"1429":{"id":1429,"name":"Coerthas Central Highlands - Intercessory","parentId":25,"size":4.0,"weatherRate":21},"1431":{"id":1431,"name":"The World of Darkness","parentId":26,"size":2.0},"1484":{"id":1484,"name":"The Gold Saucer","parentId":24,"size":4.0},"1500":{"id":1500,"name":"Chocobo Square","parentId":22,"size":1.0},"1628":{"id":1628,"name":"The Fist of the Father","parentId":498,"size":2.0},"1633":{"id":1633,"name":"The Cuff of the Father - Upper Ring","parentId":498,"size":2.0},"1638":{"id":1638,"name":"The Arm of the Father","parentId":498,"size":2.0},"1645":{"id":1645,"name":"The Burden of the Father","parentId":498,"size":2.0},"1660":{"id":1660,"name":"The Eighteenth Floor","parentId":24,"size":1.0},"2000":{"id":2000,"name":"The Dravanian Forelands","parentId":498,"size":0.95,"weatherRate":50},"2001":{"id":2001,"name":"The Dravanian Hinterlands","parentId":498,"size":0.95,"weatherRate":51},"2002":{"id":2002,"name":"The Churning Mists","parentId":498,"size":0.95,"weatherRate":52},"2003":{"id":2003,"name":"Chocobo Forest"},"2004":{"id":2004,"name":"The Smoldering Wastes"},"2006":{"id":2006,"name":"Avalonia Fallen"},"2008":{"id":2008,"name":"Mourn"},"2009":{"id":2009,"name":"The Makers' Quarter"},"2011":{"id":2011,"name":"The Ruling Quarter"},"2013":{"id":2013,"name":"Eil Tohm"},"2014":{"id":2014,"name":"Landlord Colony"},"2015":{"id":2015,"name":"Four Arms"},"2017":{"id":2017,"name":"Greensward"},"2018":{"id":2018,"name":"Tailfeather"},"2019":{"id":2019,"name":"The Hundred Throes"},"2020":{"id":2020,"name":"Whilom River"},"2021":{"id":2021,"name":"Loth ast Vath"},"2029":{"id":2029,"name":"The Iron Feast"},"2030":{"id":2030,"name":"Halo"},"2031":{"id":2031,"name":"Sohm Al"},"2033":{"id":2033,"name":"The Paths of Creation"},"2034":{"id":2034,"name":"Saint Mocianne's Arboretum - First Floor","parentId":498,"size":2.0},"2035":{"id":2035,"name":"Quickspill Delta"},"2036":{"id":2036,"name":"Matoya's Cave","parentId":498,"size":4.0},"2038":{"id":2038,"name":"The Great Gubal Library","parentId":498,"size":2.0},"2039":{"id":2039,"name":"Thaliak River"},"2042":{"id":2042,"name":"Moghome"},"2043":{"id":2043,"name":"The House of Letters"},"2048":{"id":2048,"name":"Tharl Oom Khash"},"2049":{"id":2049,"name":"Easton Eyes"},"2050":{"id":2050,"name":"The Aery","parentId":498,"size":2.0,"weatherRate":28},"2051":{"id":2051,"name":"Mother of the Sheave"},"2052":{"id":2052,"name":"The Answering Quarter"},"2064":{"id":2064,"name":"Anyx Old"},"2065":{"id":2065,"name":"The Daggers"},"2078":{"id":2078,"name":"Sothton Walls"},"2079":{"id":2079,"name":"Weston Waters"},"2080":{"id":2080,"name":"The Lost Landlord"},"2081":{"id":2081,"name":"Thok ast Thok","parentId":498,"size":4.0,"weatherRate":57},"2082":{"id":2082,"name":"Idyllshire","parentId":498,"size":4.0,"weatherRate":55},"2083":{"id":2083,"name":"Sacrificial Chamber","parentId":498,"size":4.0},"2088":{"id":2088,"name":"The Antitower - Pleroma","parentId":498,"size":2.0},"2100":{"id":2100,"name":"The Sea of Clouds","parentId":497,"size":0.95,"weatherRate":53},"2101":{"id":2101,"name":"Azys Lla","parentId":497,"size":0.95,"weatherRate":54},"2102":{"id":2102,"name":"Cloudtop"},"2103":{"id":2103,"name":"Voor Sian Siran"},"2104":{"id":2104,"name":"Vundu Ok' Bendu"},"2105":{"id":2105,"name":"The Blue Window"},"2106":{"id":2106,"name":"The Gauntlet"},"2109":{"id":2109,"name":"Alpha Quadrant"},"2110":{"id":2110,"name":"Beta Quadrant"},"2112":{"id":2112,"name":"Delta Quadrant"},"2113":{"id":2113,"name":"The Habisphere"},"2114":{"id":2114,"name":"The Flagship"},"2116":{"id":2116,"name":"Camp Cloudtop"},"2119":{"id":2119,"name":"The Nidifice"},"2120":{"id":2120,"name":"The Eddies"},"2127":{"id":2127,"name":"Hengr's Crucible"},"2128":{"id":2128,"name":"Coldwind"},"2129":{"id":2129,"name":"Mok Oogl Island"},"2130":{"id":2130,"name":"Neverreap","parentId":497,"size":2.0},"2147":{"id":2147,"name":"Aetherochemical Research Facility - Automachina Research","parentId":497,"size":2.0},"2148":{"id":2148,"name":"The Fractal Continuum - Forward Complex","parentId":497,"size":2.0},"2151":{"id":2151,"name":"The Limitless Blue","parentId":497,"size":4.0,"weatherRate":28},"2166":{"id":2166,"name":"Habisphere Control"},"2173":{"id":2173,"name":"The Pappus Tree"},"2177":{"id":2177,"name":"Hyperstellar Downconvertor"},"2178":{"id":2178,"name":"Singularity Reactor","parentId":497,"size":4.0,"weatherRate":56},"2181":{"id":2181,"name":"Void Ark - Upper Deck","parentId":497,"size":2.0,"weatherRate":37},"2200":{"id":2200,"name":"Coerthas Western Highlands","parentId":25,"size":0.95,"weatherRate":49},"2201":{"id":2201,"name":"Riversmeet"},"2202":{"id":2202,"name":"Twinpools"},"2203":{"id":2203,"name":"Red Rim"},"2204":{"id":2204,"name":"Falcon's Nest"},"2208":{"id":2208,"name":"Hemlock"},"2211":{"id":2211,"name":"Ashpool"},"2213":{"id":2213,"name":"The Bed of Bones"},"2214":{"id":2214,"name":"Dusk Vigil","parentId":25,"size":2.0,"weatherRate":42},"2217":{"id":2217,"name":"Greytail Falls"},"2220":{"id":2220,"name":"The Convictory"},"2221":{"id":2221,"name":"Black Iron Bridge"},"2223":{"id":2223,"name":"Gorgagne Holding"},"2227":{"id":2227,"name":"Dragonspit"},"2228":{"id":2228,"name":"The Watcher"},"2256":{"id":2256,"name":"Containment Bay S1T7","parentId":497,"size":4.0,"weatherRate":66},"2257":{"id":2257,"name":"Diadem Skysprings"},"2258":{"id":2258,"name":"Diadem Grotto"},"2259":{"id":2259,"name":"Southern Diadem Lake"},"2260":{"id":2260,"name":"Secluded Diadem Pond"},"2261":{"id":2261,"name":"Northern Diadem Lake"},"2262":{"id":2262,"name":"Blustery Cloudtop"},"2263":{"id":2263,"name":"Calm Cloudtop"},"2264":{"id":2264,"name":"Swirling Cloudtop"},"2300":{"id":2300,"name":"Foundation","parentId":25,"size":2.0,"weatherRate":47},"2301":{"id":2301,"name":"The Pillars","parentId":25,"size":2.0,"weatherRate":48},"2313":{"id":2313,"name":"The Lightfeather Proving Grounds","parentId":25,"size":4.0},"2320":{"id":2320,"name":"Fortemps Manor","parentId":25,"size":4.0},"2327":{"id":2327,"name":"The Vault - Chantry Nave","parentId":25,"size":2.0},"2335":{"id":2335,"name":"Seat of the Lord Commander","parentId":25,"size":4.0},"2337":{"id":2337,"name":"Saint Endalim's Scholasticate","parentId":25,"size":4.0}};
gt.location.indexkr = {"-1":{"id":-1,name:"The Diadem (Easy)","weatherRate":60,"parentId":497,"size":1},"-2":{"id":-2,name:"The Diadem","weatherRate":61,"parentId":497,"size":1},"-3":{"id":-3,name:"The Diadem (Hard)","weatherRate":62,"parentId":497,"size":1},"21":{"id":21,name:"에오르제아","parentId":21,"size":1.0},"22":{"id":22,name:"라노시아","parentId":22,"size":1.0},"23":{"id":23,name:"검은장막 숲","parentId":23,"size":1.0},"24":{"id":24,name:"다날란","parentId":24,"size":1.0},"25":{"id":25,name:"커르다스","parentId":25,"size":1.0},"26":{"id":26,name:"모르도나","parentId":26,"size":1.0},"27":{"id":27,name:"림사 로민사","parentId":22,"weatherRate":14},"28":{"id":28,name:"림사 로민사 상층 갑판","parentId":22,"size":2.0,"weatherRate":14},"29":{"id":29,name:"림사 로민사 하층 갑판","parentId":22,"size":2.0,"weatherRate":15},"30":{"id":30,name:"중부 라노시아","parentId":22,"size":1.0,"weatherRate":16},"31":{"id":31,name:"저지 라노시아","parentId":22,"size":1.0,"weatherRate":17},"32":{"id":32,name:"동부 라노시아","parentId":22,"size":1.0,"weatherRate":18},"33":{"id":33,name:"서부 라노시아","parentId":22,"size":1.0,"weatherRate":19},"34":{"id":34,name:"고지 라노시아","parentId":22,"size":1.0,"weatherRate":20},"35":{"id":35,name:"사스타샤 침식 동굴","parentId":22,"size":2.0},"36":{"id":36,name:"브레이플록스의 야영지","parentId":22,"size":2.0},"37":{"id":37,name:"방랑자의 궁전","parentId":22,"size":2.0},"39":{"id":39,name:"그리다니아","parentId":23,"weatherRate":1},"40":{"id":40,name:"울다하 날 회랑","parentId":24,"size":2.0,"weatherRate":7},"41":{"id":41,name:"울다하 달 회랑 - 상업 지구","parentId":24,"size":2.0,"weatherRate":8},"42":{"id":42,name:"서부 다날란","parentId":24,"size":1.0,"weatherRate":9},"43":{"id":43,name:"중부 다날란","parentId":24,"size":1.0,"weatherRate":10},"44":{"id":44,name:"동부 다날란","parentId":24,"size":1.0,"weatherRate":11},"45":{"id":45,name:"남부 다날란","parentId":24,"size":1.0,"weatherRate":12},"46":{"id":46,name:"북부 다날란","parentId":24,"size":1.0,"weatherRate":13},"47":{"id":47,name:"나무꾼의 비명","parentId":24,"size":2.0},"48":{"id":48,name:"구리종 광산","parentId":24,"size":2.0},"49":{"id":49,name:"할라탈리 수련장","parentId":24,"size":2.0},"50":{"id":50,name:"카른의 무너진 사원","parentId":24,"size":2.0},"51":{"id":51,name:"울다하","parentId":24,"weatherRate":7},"52":{"id":52,name:"그리다니아 신시가지","parentId":23,"size":2.0,"weatherRate":1},"53":{"id":53,name:"그리다니아 구시가지","parentId":23,"size":2.0,"weatherRate":2},"54":{"id":54,name:"검은장막 숲 중부삼림","parentId":23,"size":1.0,"weatherRate":3},"55":{"id":55,name:"검은장막 숲 동부삼림","parentId":23,"size":1.0,"weatherRate":4},"56":{"id":56,name:"검은장막 숲 남부삼림","parentId":23,"size":1.0,"weatherRate":5},"57":{"id":57,name:"검은장막 숲 북부삼림","parentId":23,"size":1.0,"weatherRate":6},"58":{"id":58,name:"탐타라 묘소","parentId":23,"size":3.0},"59":{"id":59,name:"하우케타 별굴","parentId":23,"size":2.0},"61":{"id":61,name:"토토라크 감옥","parentId":23,"size":2.0},"62":{"id":62,name:"이슈가르드","parentId":25,"size":2.0,"weatherRate":47},"63":{"id":63,name:"커르다스 중앙고지","parentId":25,"size":1.0,"weatherRate":21},"64":{"id":64,name:"제멜 요새","parentId":25,"size":2.0},"65":{"id":65,name:"금빛 골짜기","parentId":25,"size":2.0},"67":{"id":67,name:"모르도나","parentId":26,"size":1.0,"weatherRate":22},"68":{"id":68,name:"비취 호수"},"69":{"id":69,name:"숲눈물 벌채지"},"70":{"id":70,name:"굽은가지 가도"},"71":{"id":71,name:"수영풀 쉼터"},"73":{"id":73,name:"벌꿀 마당"},"74":{"id":74,name:"아홉덩굴 숲"},"75":{"id":75,name:"가시나무 숲"},"78":{"id":78,name:"높은길"},"79":{"id":79,name:"낮은길"},"81":{"id":81,name:"침묵의 화단"},"82":{"id":82,name:"우르드의 선물"},"83":{"id":83,name:"소근소근 덤불"},"84":{"id":84,name:"평온의 정원"},"85":{"id":85,name:"오리나무 샘"},"86":{"id":86,name:"영광의 개울"},"90":{"id":90,name:"배넉 연병장"},"92":{"id":92,name:"맨바위 언덕"},"94":{"id":94,name:"굽은가지 목장"},"101":{"id":101,name:"영원그늘"},"104":{"id":104,name:"움트는 연못"},"107":{"id":107,name:"호손 일가의 산장"},"112":{"id":112,name:"열두 신 대성당","parentId":23,"size":2.0,"weatherRate":4},"113":{"id":113,name:"실프 임시 주거지"},"123":{"id":123,name:"고요한 야영지"},"125":{"id":125,name:"옛 암다포르 시가지","parentId":23,"size":2.0,"weatherRate":40},"126":{"id":126,name:"징검뿌리 늪지대"},"128":{"id":128,name:"옛 암다포르 성","parentId":23,"size":2.0,"weatherRate":28},"129":{"id":129,name:"채석공방"},"144":{"id":144,name:"겔모라 유적"},"154":{"id":154,name:"The Fold","parentId":22,"size":4.0,"weatherRate":29},"155":{"id":155,name:"꽃꿀 나루"},"161":{"id":161,name:"산들바람 줄기"},"162":{"id":162,name:"여름여울"},"163":{"id":163,name:"삼 말름 굽잇길"},"164":{"id":164,name:"모라비 만"},"165":{"id":165,name:"삼나무 숲"},"166":{"id":166,name:"신의 손아귀"},"167":{"id":167,name:"핏빛해안"},"168":{"id":168,name:"빗물받이 숲"},"170":{"id":170,name:"쿼터스톤"},"171":{"id":171,name:"해골 골짜기"},"174":{"id":174,name:"참나무 숲"},"177":{"id":177,name:"청동호수"},"182":{"id":182,name:"불량배 강"},"192":{"id":192,name:"속삭임 골짜기"},"193":{"id":193,name:"니므 강"},"197":{"id":197,name:"과부의 눈물"},"200":{"id":200,name:"붉은수탉 농장"},"202":{"id":202,name:"눈먼 무쇠 갱도"},"206":{"id":206,name:"코스타 델 솔"},"211":{"id":211,name:"숨겨진 폭포"},"214":{"id":214,name:"붉은사마귀 폭포"},"216":{"id":216,name:"포도주 항구"},"218":{"id":218,name:"칼새횃대 개척지"},"220":{"id":220,name:"양조장이 등대"},"223":{"id":223,name:"맥주 항구"},"228":{"id":228,name:"배의 무덤"},"230":{"id":230,name:"시이루스 대등대","parentId":22,"size":2.0,"weatherRate":28},"234":{"id":234,name:"얼간이 폭포"},"243":{"id":243,name:"망치 대지"},"244":{"id":244,name:"지평선 가장자리"},"245":{"id":245,name:"발자국 계곡"},"246":{"id":246,name:"하늬바람 곶"},"247":{"id":247,name:"가시 빠진 분지"},"248":{"id":248,name:"검은솔 들판"},"249":{"id":249,name:"악마의 손아귀"},"250":{"id":250,name:"마른뼈 황야"},"251":{"id":251,name:"모래 관문"},"252":{"id":252,name:"웰윅 숲"},"253":{"id":253,name:"불타는 장벽"},"254":{"id":254,name:"불결한 샘터"},"255":{"id":255,name:"남부 다날란","parentId":24,"size":1.0,"weatherRate":12},"256":{"id":256,name:"붉은 미궁"},"257":{"id":257,name:"사골리 사막"},"258":{"id":258,name:"푸른안개 수맥"},"259":{"id":259,name:"라우반의 완충지"},"260":{"id":260,name:"카스트룸 메리디아눔","parentId":24,"size":2.0},"263":{"id":263,name:"전갈 교역소"},"264":{"id":264,name:"노피카의 우물"},"266":{"id":266,name:"은 장터"},"271":{"id":271,name:"지평선 관문"},"272":{"id":272,name:"초승달 만"},"274":{"id":274,name:"저녁별 만"},"275":{"id":275,name:"달샘 동굴"},"276":{"id":276,name:"파라타의 묘소"},"294":{"id":294,name:"희망 없는 유민가"},"297":{"id":297,name:"부정한 계승자"},"300":{"id":300,name:"마른뼈 야영지"},"308":{"id":308,name:"유그람 강"},"310":{"id":310,name:"검붉은 폭포"},"313":{"id":313,name:"리틀 알라미고"},"314":{"id":314,name:"도마뱀 개울"},"323":{"id":323,name:"잊힌 오아시스"},"325":{"id":325,name:"푸른안개 야영지"},"330":{"id":330,name:"청린 원천지"},"337":{"id":337,name:"모라비 조선소"},"338":{"id":338,name:"소금기둥 해변"},"339":{"id":339,name:"촛불지기 부두"},"340":{"id":340,name:"텅 빈 심장"},"341":{"id":341,name:"오쉬온 등대"},"346":{"id":346,name:"신궁부대 사령실","parentId":23,"size":8.0},"347":{"id":347,name:"말없는 선인의 좌탁","parentId":23,"size":4.0},"350":{"id":350,name:"외지 라노시아","parentId":22,"size":1.0,"weatherRate":24},"351":{"id":351,name:"사령함교: 제독실","parentId":22,"size":8.0,"weatherRate":14},"354":{"id":354,name:"은갑옷단 총장실","parentId":24,"size":4.0},"356":{"id":356,name:"모래의 집","parentId":24,"size":4.0},"357":{"id":357,name:"불꽃신의 제단","parentId":24,"size":4.0,"weatherRate":25},"358":{"id":358,name:"늑대우리 부두","parentId":22,"size":4.0,"weatherRate":29},"359":{"id":359,name:"오고모로 화산구 신전","parentId":22,"size":4.0,"weatherRate":23},"360":{"id":360,name:"가시 정원","parentId":23,"size":4.0,"weatherRate":30},"361":{"id":361,name:"울부짖는 눈 석탑군","parentId":25,"size":4.0,"weatherRate":26},"363":{"id":363,name:"사프사 산란지"},"365":{"id":365,name:"은닉 항구"},"373":{"id":373,name:"울다하 달 회랑","parentId":24,"size":2.0,"weatherRate":8},"380":{"id":380,name:"용머리 벌판"},"381":{"id":381,name:"섭리의 땅"},"383":{"id":383,name:"하얀테 설원"},"384":{"id":384,name:"할드라스 전진가도"},"385":{"id":385,name:"Observatorium"},"386":{"id":386,name:"그리핀 대교","parentId":25,"size":2.0},"389":{"id":389,name:"마녀의 비탈"},"392":{"id":392,name:"성 다니펜의 눈물"},"398":{"id":398,name:"성 다니펜의 여정"},"401":{"id":401,name:"돌방패 경계초소","parentId":25,"size":2.0,"weatherRate":27},"402":{"id":402,name:"하얀테 전초지"},"404":{"id":404,name:"얼음외투 대빙벽","parentId":25,"size":2.0},"406":{"id":406,name:"구름길","parentId":25,"size":2.0,"weatherRate":28},"410":{"id":410,name:"은빛눈물 호수 북부"},"413":{"id":413,name:"엉킨덩굴 습지대"},"414":{"id":414,name:"이른서리 고개"},"416":{"id":416,name:"성 코이나크 재단 조사지"},"417":{"id":417,name:"노래하는 열곡"},"418":{"id":418,name:"묵약의 탑","parentId":26,"size":2.0},"425":{"id":425,name:"안갯빛 마을","parentId":22,"size":2.0,"weatherRate":32},"426":{"id":426,name:"라벤더 안식처","parentId":23,"size":2.0,"weatherRate":34},"427":{"id":427,name:"하늘잔 마루","parentId":24,"size":2.0,"weatherRate":33},"430":{"id":430,name:"마도성 프라이토리움"},"459":{"id":459,name:"울부짖는 눈 석탑군","parentId":25,"size":4.0,"weatherRate":26},"464":{"id":464,name:"메테오 탐사갱 상부","parentId":22,"size":2.0},"465":{"id":465,name:"메테오 탐사갱 하부","parentId":22,"size":2.0},"466":{"id":466,name:"라그나로크급 구속함","parentId":22,"size":2.0},"467":{"id":467,name:"가동격벽","parentId":22,"size":2.0},"468":{"id":468,name:"중추구획","parentId":22,"size":2.0},"477":{"id":477,name:"후방 출입구","parentId":24,"size":4.0,"weatherRate":31},"478":{"id":478,name:"고대인의 미궁","parentId":26,"size":2.0},"481":{"id":481,name:"돌의 집","parentId":26,"size":4.0},"493":{"id":493,name:"시르쿠스 탑","parentId":26,"size":2.0},"496":{"id":496,name:"봉인된 바위섬","parentId":22,"size":1.0,"weatherRate":59},"497":{"id":497,name:"아발라시아","parentId":497,"size":1.0},"498":{"id":498,name:"드라바니아","parentId":498,"size":1.0},"654":{"id":654,name:"울다하 날 회랑 - 비공정","parentId":24,"size":2.0,"weatherRate":7},"694":{"id":694,name:"수투 훈련장"},"698":{"id":698,name:"울다하 달 회랑 - 관청 지구","parentId":24,"size":2.0,"weatherRate":8},"725":{"id":725,name:"림사 로민사 상층 갑판 - 비공정","parentId":22,"size":2.0,"weatherRate":14},"951":{"id":951,name:"잎맥 물줄기"},"952":{"id":952,name:"거울못"},"953":{"id":953,name:"청록의 나락"},"954":{"id":954,name:"잔물결 시내"},"955":{"id":955,name:"실프 영지"},"956":{"id":956,name:"하두바 강 상류"},"957":{"id":957,name:"하두바 강 중류"},"958":{"id":958,name:"하두바 강 하류"},"959":{"id":959,name:"하두바 강 동쪽"},"960":{"id":960,name:"고블린족 양식장"},"961":{"id":961,name:"술렁이는 강"},"962":{"id":962,name:"가을박 마을"},"963":{"id":963,name:"타호토틀 호수"},"964":{"id":964,name:"비취 호수"},"965":{"id":965,name:"그리다니아: 홍차강 하류"},"966":{"id":966,name:"엉킨덩굴 습지대 원류"},"967":{"id":967,name:"노래하는 열곡 북부"},"968":{"id":968,name:"커르다스 강"},"969":{"id":969,name:"칼날 봉우리"},"970":{"id":970,name:"용머리 전진기지 저수지"},"971":{"id":971,name:"조사대 얼음 구멍"},"972":{"id":972,name:"구름바다"},"973":{"id":973,name:"산들바람 줄기"},"974":{"id":974,name:"여름여울"},"975":{"id":975,name:"서쪽 아젤리스 강"},"976":{"id":976,name:"모라비 만"},"977":{"id":977,name:"삼나무 숲"},"978":{"id":978,name:"남부 핏빛해안"},"979":{"id":979,name:"북부 핏빛해안"},"980":{"id":980,name:"동쪽 아젤리스 강"},"981":{"id":981,name:"빗물받이 소택지"},"982":{"id":982,name:"해골 골짜기"},"983":{"id":983,name:"하프스톤"},"984":{"id":984,name:"환영 제도 북부"},"985":{"id":985,name:"환영 제도 남부"},"987":{"id":987,name:"청동호수 북부"},"988":{"id":988,name:"청동호수 얕은 물"},"989":{"id":989,name:"기나긴 오르막"},"990":{"id":990,name:"검댕개울 상류"},"991":{"id":991,name:"검댕개울 하류"},"992":{"id":992,name:"마른뼈 황야 북쪽 샘터"},"993":{"id":993,name:"마른뼈 황야 남쪽 샘터"},"995":{"id":995,name:"자하라크 진영"},"996":{"id":996,name:"사골리 사막"},"997":{"id":997,name:"사골리 모래언덕"},"998":{"id":998,name:"푸른안개 수맥"},"999":{"id":999,name:"그리다니아: 홍차강 상류"},"1000":{"id":1000,name:"속삭임 계곡"},"1001":{"id":1001,name:"로타노 해 먼바다: 뱃머리"},"1002":{"id":1002,name:"로타노 해 먼바다: 뱃고물"},"1003":{"id":1003,name:"얼지 않는 연못"},"1004":{"id":1004,name:"투명한 연못"},"1005":{"id":1005,name:"죽음의 호수 남쪽"},"1006":{"id":1006,name:"죽음의 호수 서쪽"},"1007":{"id":1007,name:"애도의 바위굴 서쪽"},"1008":{"id":1008,name:"살리아크 강 상류"},"1009":{"id":1009,name:"살리아크 강 중류"},"1010":{"id":1010,name:"솜 알 산머리"},"1011":{"id":1011,name:"폐수 웅덩이"},"1161":{"id":1161,name:"안갯빛 마을","parentId":22,"size":2.0,"weatherRate":32},"1162":{"id":1162,name:"안갯빛 마을 - 확장 지역","parentId":22,"size":2.0,"weatherRate":32},"1163":{"id":1163,name:"하늘잔 마루","parentId":24,"size":2.0,"weatherRate":33},"1164":{"id":1164,name:"하늘잔 마루 - 확장 지역","parentId":24,"size":2.0,"weatherRate":33},"1165":{"id":1165,name:"라벤더 안식처","parentId":23,"size":2.0,"weatherRate":34},"1166":{"id":1166,name:"라벤더 안식처 - 확장 지역","parentId":23,"size":2.0,"weatherRate":34},"1301":{"id":1301,name:"메테오의 그림자","parentId":23,"size":2.0},"1302":{"id":1302,name:"구속의 고리","parentId":23,"size":2.0,"weatherRate":28},"1303":{"id":1303,name:"라그나로크급 3번함 함체 중앙부","parentId":23,"size":2.0},"1304":{"id":1304,name:"라그나로크급 3번함 작전실","parentId":23,"size":2.0},"1334":{"id":1334,name:"대 리바이어선 쌍동선","parentId":22,"size":4.0,"weatherRate":38},"1363":{"id":1363,name:"심판의 나무","parentId":23,"size":4.0,"weatherRate":43},"1374":{"id":1374,name:"카르테노 평원: 외곽 유적지대","parentId":26,"size":1.0},"1377":{"id":1377,name:"난파선의 섬","parentId":22,"size":2.0},"1390":{"id":1390,name:"계율의 고치","parentId":26,"size":4.0},"1399":{"id":1399,name:"아크 아파 원형극장","parentId":25,"size":4.0,"weatherRate":46},"1406":{"id":1406,name:"라그나로크급 6번함 함체 중앙부","parentId":24,"size":2.0},"1407":{"id":1407,name:"라그나로크급 6번함 재생 제어 구역","parentId":24,"size":2.0},"1408":{"id":1408,name:"라그나로크급 6번함 제1함교","parentId":24,"size":2.0},"1409":{"id":1409,name:"바하무트 핵심부","parentId":24,"size":2.0,"weatherRate":44},"1429":{"id":1429,name:"응접실","parentId":25,"size":4.0,"weatherRate":21},"1431":{"id":1431,name:"어둠의 세계","parentId":26,"size":2.0},"1484":{"id":1484,name:"골드 소서","parentId":24,"size":4.0},"1500":{"id":1500,name:"초코보 광장","parentId":22,"size":1.0},"1628":{"id":1628,name:"The Fist of the Father","parentId":498,"size":2.0},"1633":{"id":1633,name:"The Cuff of the Father - Upper Ring","parentId":498,"size":2.0},"1638":{"id":1638,name:"The Arm of the Father","parentId":498,"size":2.0},"1645":{"id":1645,name:"The Burden of the Father","parentId":498,"size":2.0},"1660":{"id":1660,name:"The Eighteenth Floor","parentId":24,"size":1.0},"2000":{"id":2000,name:"고지 드라바니아","parentId":498,"size":0.95,"weatherRate":50},"2001":{"id":2001,name:"저지 드라바니아","parentId":498,"size":0.95,"weatherRate":51},"2002":{"id":2002,name:"드라바니아 구름바다","parentId":498,"size":0.95,"weatherRate":52},"2003":{"id":2003,name:"초코보 숲"},"2004":{"id":2004,name:"연기 황야"},"2006":{"id":2006,name:"쇠락한 아발로니아"},"2008":{"id":2008,name:"애도의 바위굴"},"2009":{"id":2009,name:"예술의 거리"},"2011":{"id":2011,name:"철학의 거리"},"2013":{"id":2013,name:"에일 톰"},"2014":{"id":2014,name:"지상왕의 영지"},"2015":{"id":2015,name:"네 기둥 광장"},"2017":{"id":2017,name:"잔디섬"},"2018":{"id":2018,name:"꼬리깃 마을"},"2019":{"id":2019,name:"비탄의 폭포"},"2020":{"id":2020,name:"지난날 강"},"2021":{"id":2021,name:"바스의 토굴집"},"2029":{"id":2029,name:"용의 식탁"},"2030":{"id":2030,name:"빛무리 제단"},"2031":{"id":2031,name:"솜 알"},"2033":{"id":2033,name:"창조의 길"},"2034":{"id":2034,name:"Saint Mocianne's Arboretum - First Floor","parentId":498,"size":2.0},"2035":{"id":2035,name:"급류 삼각주"},"2036":{"id":2036,name:"마토야의 동굴","parentId":498,"size":4.0},"2038":{"id":2038,name:"구브라 환상도서관","parentId":498,"size":2.0},"2039":{"id":2039,name:"살리아크 강"},"2042":{"id":2042,name:"모그모그 고향"},"2043":{"id":2043,name:"편지집"},"2048":{"id":2048,name:"살 움 카쉬"},"2049":{"id":2049,name:"동쪽 감시탑"},"2050":{"id":2050,name:"용의 둥지","parentId":498,"size":2.0,"weatherRate":28},"2051":{"id":2051,name:"성녀 시바 상"},"2052":{"id":2052,name:"학문의 거리"},"2064":{"id":2064,name:"아네스 소"},"2065":{"id":2065,name:"돌칼기둥 벼랑"},"2078":{"id":2078,name:"남쪽 성벽"},"2079":{"id":2079,name:"서쪽 샘"},"2080":{"id":2080,name:"지상왕 상"},"2081":{"id":2081,name:"무신의 투기장","parentId":498,"size":4.0,"weatherRate":57},"2082":{"id":2082,name:"이딜샤이어","parentId":498,"size":4.0,"weatherRate":55},"2083":{"id":2083,name:"공물 구멍","parentId":498,"size":4.0},"2088":{"id":2088,name:"The Antitower - Pleroma","parentId":498,"size":2.0},"2100":{"id":2100,name:"아발라시아 구름바다","parentId":497,"size":0.95,"weatherRate":53},"2101":{"id":2101,name:"아지스 라","parentId":497,"size":0.95,"weatherRate":54},"2102":{"id":2102,name:"구름마루"},"2103":{"id":2103,name:"부르 시안시란"},"2104":{"id":2104,name:"분두 오크 벤두"},"2105":{"id":2105,name:"푸른하늘 창"},"2106":{"id":2106,name:"수난의 섬"},"2109":{"id":2109,name:"알파 구역"},"2110":{"id":2110,name:"베타 구역"},"2112":{"id":2112,name:"델타 구열"},"2113":{"id":2113,name:"생태공원"},"2114":{"id":2114,name:"아지스 라 기함섬"},"2116":{"id":2116,name:"구름마루 초소"},"2119":{"id":2119,name:"철새 보금자리"},"2120":{"id":2120,name:"구름웅덩이"},"2127":{"id":2127,name:"헤느거의 도가니"},"2128":{"id":2128,name:"찬바람섬"},"2129":{"id":2129,name:"모크 우글 섬"},"2130":{"id":2130,name:"거두지 않는 섬","parentId":497,"size":2.0},"2147":{"id":2147,name:"마과학 연구소","parentId":497,"size":2.0},"2148":{"id":2148,name:"무한연속 박물함","parentId":497,"size":2.0},"2151":{"id":2151,name:"쪽빛 성역","parentId":497,"size":4.0,"weatherRate":28},"2166":{"id":2166,name:"생태공원 관리국"},"2173":{"id":2173,name:"큰갓털나무"},"2177":{"id":2177,name:"초성간교신탑"},"2178":{"id":2178,name:"특이점 반응기관","parentId":497,"size":4.0,"weatherRate":56},"2181":{"id":2181,name:"Void Ark - Upper Deck","parentId":497,"size":2.0,"weatherRate":37},"2200":{"id":2200,name:"커르다스 서부고지","parentId":25,"size":0.95,"weatherRate":49},"2201":{"id":2201,name:"맞가람 골짜기"},"2202":{"id":2202,name:"쌍둥이 연못"},"2203":{"id":2203,name:"붉은 가장자리"},"2204":{"id":2204,name:"매의 보금자리"},"2208":{"id":2208,name:"솔송나무 마을"},"2211":{"id":2211,name:"잿빛 호수"},"2213":{"id":2213,name:"예티 서식지"},"2214":{"id":2214,name:"어스름 요새","parentId":25,"size":2.0,"weatherRate":42},"2217":{"id":2217,name:"회색꼬리 폭포"},"2220":{"id":2220,name:"성 피네아 연대 야영지"},"2221":{"id":2221,name:"흑철교"},"2223":{"id":2223,name:"고르가뉴 목초지"},"2227":{"id":2227,name:"용숨결 온천"},"2228":{"id":2228,name:"감시자의 뼈"},"2256":{"id":2256,name:"Containment Bay S1T7","parentId":497,"size":4.0,"weatherRate":66},"2257":{"id":2257,name:"Diadem Skysprings"},"2258":{"id":2258,name:"Diadem Grotto"},"2259":{"id":2259,name:"Southern Diadem Lake"},"2260":{"id":2260,name:"Secluded Diadem Pond"},"2261":{"id":2261,name:"Northern Diadem Lake"},"2262":{"id":2262,name:"Blustery Cloudtop"},"2263":{"id":2263,name:"Calm Cloudtop"},"2264":{"id":2264,name:"Swirling Cloudtop"},"2300":{"id":2300,name:"이슈가르드 하층","parentId":25,"size":2.0,"weatherRate":47},"2301":{"id":2301,name:"이슈가르드 상층","parentId":25,"size":2.0,"weatherRate":48},"2313":{"id":2313,name:"나풀깃 투기장","parentId":25,"size":4.0},"2320":{"id":2320,name:"포르탕 저택","parentId":25,"size":4.0},"2327":{"id":2327,name:"이슈가르드 교황청","parentId":25,"size":2.0},"2335":{"id":2335,name:"신전기사단 총장실","parentId":25,"size":4.0},"2337":{"id":2337,name:"성 앙달림 신학원","parentId":25,"size":4.0}};