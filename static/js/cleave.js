$( function() {
    $( "#poem-container" ).sortable({
        helper: 'clone'
    });
    $( "#poem-container" ).disableSelection();
} );