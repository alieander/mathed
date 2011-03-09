/**
 * notebook.js
 * by Ryan Sandor Richards
 */ 
$(function() {
	var nb = $('.mathed-notebook')[0], 
	  mathId = 0, 
	  currentMath,
	  savedRange;
	
	// Immediately give the notbook focus
	nb.focus();
	
	/*----------------------------------------------------------------------------------------------------
	 * Utility methods
	 *---------------------------------------------------------------------------------------------------*/
  
  // Prevents default behavior and stops propagation of an event
	function halt(e) {
	  e.preventDefault();
    e.stopPropagation();
	}
	
	/*----------------------------------------------------------------------------------------------------
	 * Buttons
	 *---------------------------------------------------------------------------------------------------*/
  $('.mathmode').mousedown(function(e) {
    halt(e);
    enterMathMode();
  });
  
  $('.save').mousedown(function(e) {
    // TODO Implement me
  });
  
  $('.load').mousedown(function(e) {
    // TODO Implement me
  });
	
	/*----------------------------------------------------------------------------------------------------
	 * Math Input
	 *---------------------------------------------------------------------------------------------------*/
	 
	// Wraps the math inputs current selection in the given character(s)
 	function selectionWrap(input, chl, chr) {
 	  var caret = input.selectionStart,
 	    dollar = input.selectionEnd,
       val = $(input).val(),
       left = val.slice(0, input.selectionStart),
       middle = val.slice(input.selectionStart, input.selectionEnd),
       right = $(input).val().slice(input.selectionEnd);
     $(input).val([left, chl, middle, (chr ? chr : chl), right].join(''));

     if (dollar == caret) {
       input.selectionStart = input.selectionEnd = caret+1;
     }
     else {
       input.selectionStart = caret+1;
       input.selectionEnd = dollar+1;
     }
 	}
 	
	// Actively converts the expressions typed by the user
	function convert(e) {
	  currentMath.html( Mathed.convert($('#mathin').val()) );
		currentMath.data('src', $('#mathin').val());
		if (e.keyCode == 13 || e.keyCode == 27) {
			halt(e);
			
			if (e.keyCode == 13)
		    currentMath.after('<span class="space">&nbsp;</span>').data('new', false);
		  else if (e.keyCode == 27 && currentMath.data('new'))
		    currentMath.remove();
		    
		  exitMathMode(e.keyCode == 27);
		}
	}
	
	// Automagically balances braces
	function balance(e) {
	  var braceCounts = { ']': 0, '}': 0, ')': 0 },
  	  braces = { ')': [48, true], ']': [221, false], '}': [221, true] },
      val = $(this).val(),
	    next = val.charAt(this.selectionStart),
	    code = e.keyCode,
	    shift = e.shiftKey;
	  
	  if (code >= 37 && code <= 40) {
	    for (var k in braceCounts)
	      braceCounts[k] = 0;
	    return;
	  }
	  
	  if (e.keyCode == 219 && e.shiftKey) {
	    e.preventDefault();
	    selectionWrap(this, '{', '}');
	    braceCounts['}']++;
		}
		else if (e.keyCode == 219) {
		  e.preventDefault();
		  selectionWrap(this, '[', ']');
		  braceCounts[']']++;
		}
		else if (e.keyCode == 57 && shift) {
		  e.preventDefault();
		  selectionWrap(this, '(', ')');
		  braceCounts[')']++;
		}
		
		for (var b in braces) {
		  var brace = braces[b], 
		    c = brace[0], 
		    s = brace[1];
		  
		  if (code == c && ((!shift && !s) || (shift && s)) && next == b && braceCounts[b] > 0) {
		    e.preventDefault();
  		  this.selectionStart++;
  		  this.selectionEnd = this.selectionStart;
  		  braceCounts[b]--;
  		  break;
		  }
		}
	}
	
	// Bind math input event handlers
	$('#mathin').keydown(convert).keydown(balance).keyup(convert);
  	

	/*----------------------------------------------------------------------------------------------------
	 * The Notebook
	 *---------------------------------------------------------------------------------------------------*/
	
	// Enters math entry mode.
 	function enterMathMode(element) {
 	  saveSelection();
 	  
 	  if (!element) {
 	    insertHtmlAtCursor('<span contenteditable="false" data-id="' + (mathId++) + '" class="math"></span>');
 	    element = $('.mathed-notebook .math[data-id=' + (mathId-1) + ']');
      element.data('new', true);
      element.data('src', '');
 	  }
 	  else {
 	    element = $(element);
 	  }

 	  $(nb).find('.active').removeClass('active');
 	  element.addClass('active');

 	  currentMath = element;
 	  $('#overlay').show();
 	  $('#mathin').val(element.data('src')).show().focus();
 	}
  
  // Exits math mode and goes right back to regular editing
	function exitMathMode(restore) {
	  $(nb).find('.active').removeClass('active');
		$('#overlay, #mathin').hide();
			
		// Set the cursor position appropriately
		if (restore)
		  restoreSelection();
		else
		  setSelectionAfterMath();
	}
	
	// Inserts given HTML into the math notebook at the cursor
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
	
	// Saves the current cursor position in the notebook
	function saveSelection() {
    if(window.getSelection)
      savedRange = window.getSelection().getRangeAt(0);
    else if(document.selection)
      savedRange = document.selection.createRange();  
  }

  // Restores the current cursor position in the notebook
  function restoreSelection() {
    nb.focus();

    if (savedRange == null) 
      return;
    else if (window.getSelection) {
      var s = window.getSelection();
      if (s.rangeCount > 0) 
        s.removeAllRanges();
      s.addRange(savedRange);
    }
    else if (document.createRange)
      window.getSelection().addRange(savedRange);
    else if (document.selection)
      savedRange.select();
  }
  
  // Sets the cursor to the position immediately following the current math element
  function setSelectionAfterMath() {
    var focusElement = currentMath.next()[0];
    
    if (!focusElement) return;
    
    nb.focus();
	  setTimeout(function() {
  	  var range = document.createRange();
		  range.setStartBefore(focusElement);
		  range.setEndBefore(focusElement);

		  var sel = document.getSelection();
		  sel.removeAllRanges();
		  sel.addRange(range);
		}, 10);
  }
  
	// Catch normal typing in the notebook and look for the math character (Ctrl-m)
	$('.mathed-notebook').keydown(function(e) {	
	  if (e.keyCode == 77 && e.ctrlKey) {
			halt(e);
			enterMathMode();
		}
	});

  // Puts the user into math mode if they click a math element
	$('.math').live('click', function(e) {
    e.stopPropagation();
    if (!$(this).hasClass('.active')) {
      exitMathMode();
      enterMathMode(this);
    }
	});
});