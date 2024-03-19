//repurpose me

import { registerSW, subscribeSW, pushCommand } from './push-index.js'
document.addEventListener('DOMContentLoaded', function(){

    $("#deleteme").click(function() {
        // fetch('/blank', {
        //     method: 'POST', // or 'PUT'
        //     body: JSON.stringify("blank"), // data can be `string` or {object}!
        //     headers:{
        //     'Content-Type': 'application/json'
        //     }
        // }).then(res => res.json())
        // .then(response => console.log('Success:', JSON.stringify(response)))
        // .catch(error => console.error('Error:', error));
        registerSW()
    });
    
    $("#subscribe").click(function() {subscribeSW()})
    
    $("#push").click(function(){pushCommand()})
});