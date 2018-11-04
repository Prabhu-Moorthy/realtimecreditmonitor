'use strict';


$(document).ready(function() { 
	$("#auth-form").submit(function(){
		var userName =  document.getElementById("username").value ;
		var pass =  document.getElementById("password").value ;
		localStorage.setItem("username", userName);
	    var auth = false;
	    if(userName === "credit-user" && pass === "user"){
			auth = true;
		}else if(userName === "mark@CS.com" && pass === "CS@123"){
			auth = true;
		}
	    
	})
});