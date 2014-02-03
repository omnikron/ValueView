/**
 * eachchange jQuery event
 *
 * The "eachchange" event catches all designated input events. In recent browsers, it basically
 * delegates to the "input" event. Older browsers are supported by fallback events to achieve some
 * kind of simulation of the "input" event.
 *
 * @licence GNU GPL v2+
 * @author H. Snater < mediawiki@snater.com >
 *
 * @dependency jquery.client
 */
( function( $ ) {
	'use strict';

	/**
	 * Event id used for data binding and as namespace.
	 * @type {string}
	 */
	var EVENT_ID = 'jqueryEventSpecialEachchange';

	/**
	 * Name(s) of events that are in fact supported by the client.
	 * @type {string}
	 */
	var inputEvent = null;

	$.event.special.eachchange = {
		setup: function( data, namespaces, eventHandle ) {
			inputEvent = getInputEvent();
		},

		add: function( handleObj ) {
			var eventData = $.data( this, EVENT_ID + handleObj.namespace ),
				$elem = $( this ),
				eventId = EVENT_ID + handleObj.namespace,
				eventNameString = assignNamespace( inputEvent, eventId );

			if( !eventData ) {
				eventData = { handlers:[], prevVal: getValue( $elem ) };
			}

			// Store the handler to be able to determine whether handler has been triggered already
			// when issuing a .trigger(Handler)():
			eventData.handlers.push( handleObj.handler );
			$.data( this, eventId, eventData );

			// Delegate the "eachchange" event to the supported input event(s):
			$elem.on( eventNameString, function( event ) {
				eventData = $.data( this, eventId );

				event.origType = event.type;
				event.type = 'eachchange';

				handleObj.handler.call( this, event, eventData.prevVal );

				eventData.prevVal = getValue( $elem );
				$.data( this, eventId, eventData );
			} );
		},

		remove: function( handleObj ) {
			$( this ).off( '.' + EVENT_ID + handleObj.namespace );
			$.removeData( this, EVENT_ID + handleObj.namespace );
		},

		trigger: function( event, data ) {
			// Since the value might have changed multiple times programmatically before calling
			// .trigger(Handlers)(), the previous value will be set to the current value and
			// forwarded to the handler(s) when issuing .trigger(Handler)().
			var self = this,
				prevVal = getValue( $( this ) );

			$.each( $.data( this ), function( eventId, eventData ) {
				if( eventId.indexOf( EVENT_ID ) === 0 ) {
					eventData.prevVal = prevVal;
					$.data( self, eventId, eventData );
				}
			} );

			// Reset cache of already triggered handlers:
			triggeredHandlers = [];
		},

		handle: function( event, data ) {
			if( event.namespace !== '' ) {
				var eventData = $.data( this, EVENT_ID + event.namespace );
				if( eventData ) {
					event.handleObj.handler.call( this, event, eventData.prevVal );
				}

			} else {
				var self = this;

				$.each( $.data( this ), function( eventId, eventData ) {
					if( eventId.indexOf( EVENT_ID ) !== 0 ) {
						// Event is not an eachchange event.
						return true;
					}

					var handlers = $.data( self, eventId ).handlers;

					for( var i = 0; i < handlers.length; i++ ) {
						if( !alreadyTriggered( eventId, i ) ) {
							handlers[i].call( self, event, eventData.prevVal );

							triggeredHandlers.push( {
								id: eventId,
								index: i
							} );

						}
					}

				} );
			}

			return event;
		}
	};

	var triggeredHandlers = [];

	/**
	 * Checks whether a handler with a given event id has already been triggered.
	 *
	 * @param {string} eventId
	 * @param {number} index Numeric index within the list of handlers attached with the same
	 *        event id.
	 */
	function alreadyTriggered( eventId, index ) {
		for( var i = 0; i < triggeredHandlers.length; i++ ) {
			if( eventId === triggeredHandlers[i].id && index === triggeredHandlers[i].index ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns the value of a jQuery element or null if the element does not feature retrieving its
	 * value via .val().
	 *
	 * @param {jQuery} $elem
	 * @return {*}
	 */
	function getValue( $elem ) {
		// If the native element does not feature getting its value, an error is caused in the
		// jQuery mechanism trying to retrieve the value.
		try {
			return $elem.val();
		} catch( e ) {
			return null;
		}
	}

	/**
	 * Assigns a namespace to a string of one or more event names separated by a space character.
	 *
	 * @param {string} eventNames
	 * @param {string} namespace
	 * @return {string}
	 */
	function assignNamespace( eventNames, namespace ) {
		var names = eventNames.split( ' ' ),
			namespacedNames = [];

		for( var i = 0; i < names.length; i++ ) {
			namespacedNames.push( names[i] + '.' + namespace );
		}

		return namespacedNames.join( ' ' );
	}

	/**
	 * Returns a string of on or more event names to be used for detecting any instant changes of an
	 * input box. This should be just 'input' in recent browsers.
	 *
	 * @return {string}
	 */
	function getInputEvent() {
		// IE (at least <= version 9) does not trigger input event when pressing backspace
		// (version <= 8 does not support input event at all anyway)
		if ( $.client.profile().name === 'msie' && $.client.profile().versionNumber >= 9 ) {
			return 'input keyup';
		}

		var fallbackEvents = 'keyup keydown blur cut paste mousedown mouseup mouseout',
			$input = $( '<input/>' ),
			supported = 'oninput' in $input[0];
		return ( supported ) ? 'input' : fallbackEvents;
	}

}( jQuery ) );