gt.bell.timers = [
	{
		title: "Event Stage GATE",
		func: "GATE",
		minute: 45,
        uptime: 2,
		desc: "The Time of My Life, Any Way the Wind Blows",
		id: "t1",
        coords: [7.5, 5.5],
        zone: "The Gold Saucer"
	},
	{
		title: "Side Stage GATE",
		func: "GATE",
		minute: 15,
        uptime: 15,
		desc: "Cliffhanger, Vase Off, Skinchange We Can Believe In",
		id: "t2"
	},
    {
    	id: "h1",
    	title: "Central Shroud",
    	func: "hunt",
    	name: "Laideronnette",
    	transition: ['Rain'],
        weather: ['Rain'],
        after: { eorzeaHours: 2 },
        cooldown: "43 - 48",
        maintenanceCooldown: "25 - 29",
        conditions: "After 10 Eorzean hours of rain (two cycles.)",
        patch: 2.3
    },
    {
    	id: "h2",
    	title: "South Shroud",
    	func: "hunt",
    	name: "Mindflayer",
    	moon: { phase: 0, offset: 18 },
    	cooldown: "50",
    	maintenanceCooldown: "30",
    	conditions: "Midnight on the second day of new moon.",
        patch: 2.3
    },
    {
    	id: "h3",
    	title: "Lower La Noscea",
    	func: "hunt",
    	name: "Croakadile",
    	moon: { phase: 4, offset: 17 },
    	cooldown: "50",
    	maintenanceCooldown: "30",
    	conditions: "First day of full moon after 5PM ET.",
        patch: 2.3
    },
    {
    	id: "h4",
    	title: "Eastern La Noscea",
    	func: "hunt",
    	name: "The Garlok",
    	cooldown: "42 - 48",
    	maintenanceCooldown: "21 - 29",
    	conditions: "200m of dry weather after showers or rain.",
        patch: 2.3
    },
    {
    	id: "h5",
    	title: "Western Thanalan",
    	func: "hunt",
    	name: "Zona Seeker",
    	cooldown: "58 - 68",
    	maintenanceCooldown: "35 - 41",
    	conditions: "Catch a Glimmerscale.",
    	weather: ['Clear Skies', 'Fair Skies'],
    	fish: {
            "name": "Glimmerscale",
            "patch": 2.2,
            "cbh": 237,
            "bait": [
              "Butterworm"
            ],
            "weather": [
              "Clear Skies",
              "Fair Skies"
            ],
            "id": 7714,
            "icon": 4631,
            "func": "fish",
            "title": "Nophica's Wells",
            "category": "Freshwater Fishing",
            "lvl": 5,
            "coords": [
              24.5,
              21.58
            ],
            "radius": 400,
            "zone": "Western Thanalan"
    	},
        patch: 2.3
    },
    {
    	id: "h6",
    	title: "North Shroud",
    	func: "hunt",
    	name: "Thousand-Cast Theda",
    	cooldown: "58 - 68",
    	maintenanceCooldown: "35 - 41",
    	conditions: "Catch a Judgeray.",
    	during: { start: 17, end: 21 },
    	fish: {
            "name": "Judgeray",
            "patch": 2.2,
            "cbh": 218,
            "bait": [
              "Wildfowl Fly"
            ],
            "during": {
              "start": 17,
              "end": 21
            },
            "id": 7695,
            "icon": 4612,
            "func": "fish",
            "title": "Fallgourd Float",
            "category": "Freshwater Fishing",
            "lvl": 15,
            "coords": [
              21.02,
              24.66
            ],
            "radius": 400,
            "zone": "North Shroud"
    	},
        patch: 2.3
    }
];