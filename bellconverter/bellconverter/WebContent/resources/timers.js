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
        conditions: "Spawns after 10 Eorzean hours of rain (two cycles.)",
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
    	conditions: "Spawns after midnight on the second day of new moon.",
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
    	conditions: "Spawns on the first day of full moon after 5PM ET.",
        patch: 2.3
    },
    {
    	id: "h4",
    	title: "Eastern La Noscea",
    	func: "hunt",
    	name: "The Garlok",
    	cooldown: "42 - 48",
    	maintenanceCooldown: "21 - 29",
    	conditions: "Spawns after 200 real minutes of dry weather following showers or rain.",
        patch: 2.3
    },
    {
    	id: "h5",
    	title: "Western Thanalan",
    	func: "hunt",
    	name: "Zona Seeker",
    	cooldown: "58 - 68",
    	maintenanceCooldown: "35 - 41",
    	conditions: "Spawns upon catching a Glimmerscale at Nophica's Wells.",
    	weather: ['Clear Skies', 'Fair Skies'],
    	fish: {
    		id: 7714,
    		icon: 4631,
    		name: "Glimmerscale",
    		bait: ['Butterworm']
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
    	conditions: "Spawns upon catching a Judgeray at Fallgoard Float.",
    	during: { start: 17, end: 21 },
    	fish: {
    		id: 7695,
    		icon: 4612,
    		name: "Judgeray",
    		bait: ['Wildfowl Fly'],
    	},
        patch: 2.3
    }
];