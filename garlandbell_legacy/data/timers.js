gt.bell.timers = [
	{
		"title": "이벤트 광장 돌발게임",
		"func": "GATE",
		"minute": 45,
		"desc": "춤춰라! 댄스 마스터<br>버텨라! 콧바람 폭풍",
		"id": "t1"
	},
	{
		"title": "원형 광장 돌발게임",
		"func": "GATE",
		"minute": 30,
		"desc": "구해라! 꼬마 친구 구조대<br>찾아라! 변신 능력자<br>달려라! 랍토르 운수",
		"id": "t2"
	},
    {
    	id: "h1",
    	title: "검은장막 숲 중부삼림",
    	func: "hunt",
    	name: "Laideronnette",
    	namek: "레드로네트",
		transition: ['비'],
        weather: ['비'],
        after: { eorzeaHours: 2 },
        cooldown: "43 - 48",
        maintenanceCooldown: "25 - 29",
        conditions: "10시간(2연속) 비가 내리면 생성"
    },
    {
    	id: "h2",
    	title: "검은장막 숲 남부삼림",
		func: "hunt",
    	name: "Mindflayer",
    	namek: "정신지배자",
    	moon: { phase: 0, offset: 18 },
    	cooldown: "50",
    	maintenanceCooldown: "30",
    	conditions: "초승달이 뜬 둘째날의 12시가 지나면 생성"
    },
    {
    	id: "h3",
    	title: "저지 라노시아",
		func: "hunt",
    	name: "Croakadile",
    	namek: "개굴개로스",
    	moon: { phase: 4, offset: 17 },
    	cooldown: "50",
    	maintenanceCooldown: "30",
    	conditions: "에오르제아 시간 5PM 이후 첫 만월에 생성"
    },
    {
    	id: "h4",
    	title: "동부 라노시아",
		func: "hunt",
    	name: "The Garlok",
    	namek: "갈록",
    	cooldown: "42 - 48",
    	maintenanceCooldown: "21 - 29",
    	conditions: "비/폭우 이후 실제시간 200분 동안 마른 날씨면 생성"
    },
    {
    	id: "h5",
    	title: "서부 다날란",
		func: "hunt",
    	name: "Zona Seeker",
    	namek: "조나 시커",
    	cooldown: "58 - 68",
    	maintenanceCooldown: "35 - 41",
    	conditions: "노피카의 우물에서 구리거울을 낚시하면 생성",
    	weather: ['쾌청', '맑음'],
    	fish: {
    		id: 7714,
    		icon: 4631,
    		name: "구리거울",
    		bait: ['버터벌레']
    	}
    },
    {
    	id: "h6",
    	title: "검은장막 숲 북부삼림",
		func: "hunt",
    	name: "Thousand-Cast Theda",
    	namek: "천갈래덩굴 세다",
    	cooldown: "58 - 68",
    	maintenanceCooldown: "35 - 41",
    	conditions: "가을박 호수에서 심판가오리를 낚으면 생성",
		during: { start: 17, end: 21 },
    	fish: {
    		id: 7695,
    		icon: 4612,
    		name: "심판가오리",
    		bait: ['꿩깃 털바늘'],
    	}
    }
];