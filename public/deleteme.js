
document.addEventListener('DOMContentLoaded', function(){
    
    const blah = {
        dude:"foo",
    }
    console.log(blah)
    $("#deleteme").click(function() {
        fetch('/serviceWorker', {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(blah), // data can be `string` or {object}!
            headers:{
            'Content-Type': 'application/json'
            }
        }).then(res => res.json())
        .then(response => console.log('Success:', JSON.stringify(response)))
        .catch(error => console.error('Error:', error));
    });
});