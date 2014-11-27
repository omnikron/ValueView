jQuery.valueview = jQuery.valueview || {};

( function( $, vv, util ) {
	'use strict';

	/**
	 * Creates a new expert definition as it is required by jQuery.valueview.valueview.
	 *
	 * NOTE: Just by defining a new expert here, the expert won't be available in a valueview
	 *  widget automatically. The expert has to be registered in a jQuery.valueview.ExpertStore
	 *  instance which has to be used as expert store in the valueview widget's options.
	 *
	 * @see jQuery.valueview.Expert
	 *
	 * @member jQuery.valueview
	 * @method expert
	 * @static
	 * @since 0.1
	 * @licence GNU GPL v2+
	 * @author Daniel Werner < daniel.werner@wikimedia.de >
	 *
	 * @param {string} name Should be all-lowercase and without any special characters. Will be used
	 *        in within some DOM class attributes and
	 * @param {Function} base Constructor of the expert the new expert should be based on.
	 * @param {Function} constructorOrExpertDefinition Constructor of the new expert.
	 * @param {Object} [expertDefinition] Definition of the expert.
	 * @return {jQuery.valueview.Expert} the new expert constructor.
	 *
	 * @throws {Error} if the base constructor is not a function.
	 */
	vv.expert = function( name, base, constructorOrExpertDefinition, expertDefinition ) {
		var constructor = null;

		if( expertDefinition ) {
			constructor = constructorOrExpertDefinition;
		} else {
			expertDefinition = constructorOrExpertDefinition;
		}

		if( !$.isFunction( base ) ) {
			throw new Error( 'The expert\'s base must be a constructor function' );
		}

		// do actual inheritance from base and apply custom definition:
		return util.inherit(
			'ValueviewExpert_' + name,
			base,
			constructor,
			$.extend( expertDefinition, {
				uiBaseClass: 'valueview-expert-' + name
			} )
		);
	};

	// TODO: think about whether there should be a function to add multiple notifiers for widget
	//  developers or whether they should rather listen to the valueview widget while the experts
	//  can not be touched. Less performant alternative would be the usage of DOM events.
	/**
	 * Abstract class for strategies used in jQuery.valueview.valueview for displaying and handling
	 * a certain type of data value or data values suitable for a certain data type.
	 * The expert itself is conceptually not dependent on data types. It always works with data
	 * values but the way it is presenting the edit interface could be optimized for data values
	 * suitable for a certain data type. This could for example be done by restrictions in the
	 * edit interface by reflecting a data type's validation rules.
	 *
	 * NOTE: Consider using jQuery.valueview.expert to define a new expert instead of inheriting
	 *       from this base directly.
	 *
	 * @class jQuery.valueview.Expert
	 * @abstract
	 * @since 0.1
	 *
	 * @constructor
	 *
	 * @param {HTMLElement|jQuery} viewPortNode
	 * @param {jQuery.valueview.ViewState} relatedViewState
	 * @param {util.Notifier} [valueViewNotifier=util.Notifier()]
	 *        Required so the expert can notify the valueview about certain events. The following
	 *        notification keys can be used:
	 *        - change: will be sent when raw value displayed by the expert changes. Either by a
	 *                  user action or by calling the rawValue() method. First parameter is a
	 *                  reference to the Expert itself.
	 * @param {Object} [options={}]
	 *
	 * @throws {Error} if viewPortNode is not or does not feature a proper DOM node.
	 * @throws {Error} relatedViewState is not a jQuery.valueview.ViewState instance.
	 * @throws {Error} if valueViewNotifier is not an util.Notifier instance.
	 */
	vv.Expert = function( viewPortNode, relatedViewState, valueViewNotifier, options ) {
		if( !( relatedViewState instanceof vv.ViewState ) ) {
			throw new Error( 'No ViewState object was provided to the valueview expert' );
		}

		if( !valueViewNotifier ) {
			valueViewNotifier = util.Notifier();
		}
		else if( !( valueViewNotifier instanceof util.Notifier ) ) {
			throw new Error( 'No Notifier object was provided to the valueview expert' );
		}

		if( viewPortNode instanceof $
			&& viewPortNode.length === 1
		) {
			viewPortNode = viewPortNode.get( 0 );
		}

		if( !( viewPortNode.nodeType ) ) { // IE8 can't check for instanceof HTMLElement
			throw new Error( 'No sufficient DOM node provided for the valueview expert' );
		}

		this._viewState = relatedViewState;
		this._viewNotifier = valueViewNotifier;

		this.$viewPort = $( viewPortNode );

		this._options = $.extend( ( !this._options ) ? {} : this._options, options || {} );

		var defaultMessages = this._options.messages || {},
			msgGetter = this._options.mediaWiki ? this._options.mediaWiki.msg : null;
		this._messageProvider = new util.MessageProvider( {
			defaultMessage: defaultMessages,
			messageGetter: msgGetter
		} );

		this._extendable = new util.Extendable();
	};

	vv.Expert.prototype = {
		/**
		 * A unique UI class for this Expert definition. Should be used to prefix classes on DOM
		 * nodes within the Expert's view port. If a new expert definition will be created using
		 * jQuery.valueview.Expert(), then this will be set by that function.
		 * @property {string}
		 * @readonly
		 */
		uiBaseClass: '',

		/**
		 * The DOM node which has to be updated by the draw() function. Displays current state
		 * and/or input elements for user interaction during valueview's edit mode.
		 * @property {jQuery}
		 * @readonly
		 */
		$viewPort: null,

		/**
		 * Object representing the state of the related valueview.
		 * @property {jQuery.valueview.ViewState}
		 * @protected
		 */
		_viewState: null,

		/**
		 * Object for publishing changes to the outside.
		 * @property {util.Notifier}
		 * @protected
		 */
		_viewNotifier: null,

		/**
		 * The expert's options, received through the constructor.
		 * @property {Object} [_options={}]
		 * @protected
		 */
		_options: null,

		/**
		 * Message provider used to fetch messages from mediaWiki if available.
		 * @property {util.MessageProvider}
		 * @protected
		 */
		_messageProvider: null,

		/**
		 * @property {util.Extendable} [_ectendable=new util.Extendable()]
		 * @protected
		 */
		_extendable: null,

		addExtension: function( extension ){
			this._extendable.addExtension( extension );
		},

		/**
		 * Will be called initially for new expert instances.
		 * @since 0.5
		 */
		init: function() {
			this.$viewPort.addClass( this.uiBaseClass );
			this._init(); // for backwards-compatibility
			this._extendable.callExtensions( 'init' );
		},

		/**
		 * Custom expert initialization routine.
		 * @protected
		 */
		_init: function() {},

		/**
		 * Destroys the expert. All generated viewport output is being deleted and all resources
		 * (private members, events handlers) will be released.
		 *
		 * This will not preserve the plain text of the last represented value as one might expect
		 * when thinking about the common jQuery.Widget's behavior. This is mostly because it is
		 * not the Expert's responsibility to be able to serve a plain text representation of the
		 * value. If the value should be represented as plain text after the expert's construction,
		 * let the responsible controller use a value formatter for that.
		 */
		destroy: function() {
			if( !this.$viewPort ) {
				return; // destroyed already
			}
			this._extendable.callExtensions( 'destroy' );
			this.$viewPort.removeClass( this.uiBaseClass ).empty();
			this.$viewPort = null;
			this._viewState = null;
			this._viewNotifier = null;
			this._messageProvider = null;
			this._options = null;
		},

		// TODO: This should actually move out of here together with all the advanced input features
		//  of certain experts (time/coordinate).
		/**
		 * Returns an object with characteristics specified for the value. The object can be used
		 * as parser options definition.
		 *
		 * This method should allow to be called statically, i. e. without a useful `this` context.
		 *
		 * @return {Object}
		 */
		valueCharacteristics: function() {
			return {};
		},

		/**
		 * Returns an object offering information about the related valueview's current state.
		 * The expert reflects that state, so everything that is true for the related view, is also
		 * true for the expert (e.g. whether it is in edit mode or disabled).
		 *
		 * @return {jQuery.valueview.ViewState}
		 */
		viewState: function() {
			return this._viewState;
		},

		/**
		 * Will return the value as a string.
		 * @abstract
		 *
		 * @return {string} Returns the current raw value.
		 */
		rawValue: util.abstractMember,

		/**
		 * Will draw the user interface components for the user to edit the value.
		 *
		 * @return {Object} jQuery.Promise
		 * @return {Function} return.done
		 * @return {Function} return.fail
		 */
		draw: function() {
			this._extendable.callExtensions( 'draw' );
		},

		/**
		 * Will set the focus if there is some focusable input elements.
		 */
		focus: function() {},

		/**
		 * Makes sure that the focus will be removed from any focusable input elements.
		 */
		blur: function() {}
	};

}( jQuery, jQuery.valueview, util ) );
