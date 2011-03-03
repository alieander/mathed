/**
 * notebook.js
 * by Ryan Sandor Richards
 */
$(function() {
	var nb = $('.mathed-notebook')[0], 
	  mathId = 0, 
	  currentMath = null;
	
	// Exits math mode and goes right back to regular editing
	function exitMathMode() {
	  nb.focus();
	  $(nb).find('.active').removeClass('active');
		$('#mathin').hide();
	}
	
	// Puts the user into math mode if they click a math element
	$('.math').live('click', function(e) {
    var $this = $(this);
    
    e.stopPropagation();
    
    if ($this.hasClass('active')) {
      mode = mathMode;
      $('#mathin').val( $this.data('src') ).show().focus();
    }
    else {
      $(nb).find('.active').removeClass('active');
      $this.addClass('active');
    }
	});
	
	// Actively converts the expressions typed by the user
	function convert(e) {
		currentMath.html( Mathed.convert($('#mathin').val()) );
		currentMath.data('src', $('#mathin').val());
		if (e.keyCode == 13) {
			e.stopPropagation();
			e.preventDefault();
		  currentMath.after('<span>&nbsp;</span>').data('new', false);
		  exitMathMode();
		}
		else if (e.keyCode == 27 && currentMath.data('new')) {
		  e.stopPropagation();
		  e.preventDefault();
		  currentMath.remove();
		  exitMathMode();
		}
	}
	$('#mathin').keydown(convert).keyup(convert);
  	
	// Helper function, inserts HTML at the cursor location of the notebook
	function insertHtmlAtCursor(html) {
	    var range, node;
	    if (window.getSelection && window.getSelection().getRangeAt) {
	        range = window.getSelection().getRangeAt(0);
	        node = range.createContextualFragment(html);
	        range.insertNode(node);
	    } else if (document.selection && document.selection.createRange) {
	        document.selection.createRange().pasteHTML(html);
	    }
	}
	
	// Catch normal typing in the notebook and look for the math character (Ctrl-m)
	$('.mathed-notebook').keydown(function(e) {	
	  if (e.keyCode == 77 && e.ctrlKey) {
			e.stopPropagation();
			e.preventDefault();
			
			var active = $(nb).find('.active');
			
			if (active.length) {
			  currentMath = active;
			  $('#mathin').val( currentMath.data('src') ).show().focus();
			}
			else {
			  insertHtmlAtCursor('<span data-id="' + (mathId++) + '" class="math active"></span>');
  			currentMath = $('.mathed-notebook .math[data-id=' + (mathId-1) + ']');
  			currentMath.data('new', true);
  			$('#mathin').val('').show().focus();
			}
		}
	}).click(exitMathMode);
});