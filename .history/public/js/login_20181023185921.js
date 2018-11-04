'use strict';


$(document).ready(function() { 
	$("#auth-form").submit(function(){
		var userName =  document.getElementById("username").value ;
		var pass =  document.getElementById("password").value ;
		localStorage.setItem("username", userName);
	    var auth = false;
	    if(userName === "chris@MS.com" && pass === "MS@123"){
			auth = true;
		}else if(userName === "mark@CS.com" && pass === "CS@123"){
			auth = true;
		}
	    
	})
});