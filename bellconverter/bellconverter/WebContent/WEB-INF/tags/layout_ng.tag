<%@ tag description="Layout Template" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags"%>
<%@ attribute name="tab" required="false" type="java.lang.String"%>
<spring:url value="/resources/" var="RESOURCES" />
<!doctype html>
<html class="no-js" lang="en">
	<head>
		<meta http-equiv="content-type" content="text/html; charset=utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta name="keywords" content="파이널판타지14,MMORPG,파이널판타지14 온라인,파이널 판타지 14,파이널 판타지,파판14,Final Fantasy XIV: A Realm Reborn,Final Fantasy XIV: ARR,FF14,SETINE, HEAVENSWARD">
		<meta name="description" content="파판14,데이터베이스">
		<title>GarlandBell Converter</title>
		<link rel="shortcut icon" type="image/x-icon" href="https://setine.net/ff14/images/favi2.png">
		<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/angularjs/1.6.2/angular.min.js"></script>
		<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/0.10.0/lodash.min.js"></script>
		<script src="https://setine.net/ff14/resources/js/angular/angularutil.js"></script>
		<script src="https://setine.net/ff14/resources/js/angular/angularapp.js"></script>
	</head>
	<!-- Start Body -->
	<body ng-app="SetineApp">
		<jsp:doBody />
	</body>
	<!-- End Body -->
</html>