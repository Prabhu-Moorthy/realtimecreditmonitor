'use strict';

$(document).ready(function() {
    $("#crawlFrm").submit(function(e){
            e.preventDefault();       
            document.getElementById('id01').style.display='block';
            $.ajax({type:"POST",url: "/crawl", success: function(result){
                document.getElementById('id01').style.display='none';
                document.getElementById('crawlMsg').style.display='block';
            }}); 
        });

    $("#scoreFrm").submit(function(e){
        e.preventDefault();       
        document.getElementById('id01').style.display='block';
        $.ajax({type:"POST",url: "/score", success: function(result){
            document.getElementById('id01').style.display='none';
            document.getElementById('scoreMsg').style.display='block';
        }}); 
    });
});