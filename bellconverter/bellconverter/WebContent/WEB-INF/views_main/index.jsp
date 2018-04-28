<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags"%>
<spring:url value="/resources/" var="resources" />
<script src="${resources}nodes.js"></script>
<t:layout_ng tab="home">
	<div ng-cloak ng-controller="HomeController">
		<div>
			<button ng-click="changer_nodes()">Change nodes!</button>
			<button ng-click="changer_fish()">Change fish!</button>
			<div>{{nodes}}</div>
		</div>
	</div>
	<script>
	var requestUrl = "./process";
	var postparam = nodes;
	

    app.controller("HomeController", function($scope, $http, PagerService) {

    	var postAjax = function (requestUrl, postparam, method) {
    		method({method: "POST", url: requestUrl, data: postparam}).then(responseAjax);
    	}    	
    	
    	var responseAjax = function (response) {
   			$scope.nodes = response.data;
        }

    	// progess
    	$scope.nodes = nodes;
		$scope.changer_nodes = function() {
		    postAjax(requestUrl, postparam, $http);
		    console.log($scope);
		}		
	});
	</script>
</t:layout_ng>
