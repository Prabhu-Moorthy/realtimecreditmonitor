var speech = SpeechToText;
var activeSTT;

function listen() {
    activeSTT = speech.listen({
        onStart: function() {
            console.log('onStart Speech event');
        },
        onResult: function(e) {
            console.log('onResult Speech event', e.text);
            document.getElementById('textInput').value = e.text;
            if (e.isFinal) {
                stopListening();
            }
        },
        onError: function(e) {
            console.log('onError Speech event', e);
        },
        onEnd: function(e) {
            console.log('onEnd Speech event', e);
            stopListening();
            document.getElementById("micButton").src="images/chat/mic_small.png";
        	ConversationPanel.inputKeyDown(13, document.getElementById("textInput"));
        }
    });
}

function startListening() {
    if (activeSTT) {
    	stopListening();
    	document.getElementById("micButton").src="images/chat/mic_small.png";
    	ConversationPanel.inputKeyDown(13, document.getElementById("textInput"));
    } else if (speech.isSupported) {
    	document.getElementById("micButton").src="images/chat/watson.gif";
        listen();
    } else {
        alert('speech not supported by this browser');
    }
}

function stopListening() {
    if (activeSTT) {
        activeSTT.stop();
        activeSTT = null;
    }
}

document.querySelector('#micButton').onclick = startListening;