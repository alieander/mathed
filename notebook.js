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
		
		$('#overlay, #mathin').hide();
	}
	
	// Enters math entry mode
	function enterMathMode(element) {
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
	
	/*----------------------------------------------------------------------------------------------------
	 * Math Elements
	 *---------------------------------------------------------------------------------------------------*/
	
	// Puts the user into math mode if they click a math element
	$('.math').live('click', function(e) {
    e.stopPropagation();
    if (!$(this).hasClass('.active')) {
      exitMathMode();
      enterMathMode(this);
    }
	});
	
	/*----------------------------------------------------------------------------------------------------
	 * Math Input
	 *---------------------------------------------------------------------------------------------------*/
	 
	// Actively converts the expressions typed by the user
	function convert(e) {
	  currentMath.html( Mathed.convert($('#mathin').val()) );
		currentMath.data('src', $('#mathin').val());
		if (e.keyCode == 13 || e.keyCode == 27) {
			e.stopPropagation();
			e.preventDefault();
			
			if (e.keyCode == 13)
		    currentMath.after('<span>&nbsp;</span>').data('new', false);
		  else if (e.keyCode == 27 && currentMath.data('new'))
		    currentMath.remove();
		    
		  exitMathMode();
		}
	}
	
	// Automagically balances braces
	var braceCounts = { ']': 0, '}': 0, ')': 0 };
	var braces = { ')': [48, true], ']': [221, false], '}': [221, true] };
  
	function balance(e) {
	  var val = $(this).val(),
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
	
	$('#mathin').keydown(convert).keydown(balance).keyup(convert);
  	

	/*----------------------------------------------------------------------------------------------------
	 * Notebook Scripting
	 * TODO Classify this mf-er
	 *---------------------------------------------------------------------------------------------------*/
	
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
			enterMathMode();
		}
	}).click(exitMathMode);
});