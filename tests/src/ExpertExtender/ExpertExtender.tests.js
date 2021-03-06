/**
 * @licence GNU GPL v2+
 * @author Adrian Lang < adrian.lang@wikimedia.de >
 */
/* jshint nonew: false */
( function( $, ExpertExtender, sinon, QUnit, CompletenessTest ) {
	'use strict';

	QUnit.module( 'jquery.valueview.ExpertExtender' );

	if( QUnit.urlParams.completenesstest && CompletenessTest ) {
		new CompletenessTest( ExpertExtender.prototype, function( cur, tester, path ) {
			return false;
		} );
	}

	QUnit.test( 'Constructor', function( assert ) {
		var expertExtender = new ExpertExtender( $( '<input/>' ), [] );

		assert.ok(
			expertExtender instanceof ExpertExtender,
			'Instantiated ExpertExtender.'
		);

		assert.notDeepEqual( expertExtender, ExpertExtender.prototype );
	} );

	QUnit.test( 'destroy cleans up properties', function( assert ) {
		var expertExtender = new ExpertExtender( $( '<input/>' ), [] );

		expertExtender.destroy();

		assert.deepEqual( expertExtender, ExpertExtender.prototype );
	} );

	QUnit.test( 'destroy calls extensions', function( assert ) {
		var destroy = sinon.spy(),
			expertExtender = new ExpertExtender( $( '<input/>' ), [ {
				destroy: destroy
			} ] );

		expertExtender.destroy();

		sinon.assert.calledOnce( destroy );
	} );

	QUnit.asyncTest( 'init calls extensions', function( assert ) {
		var $input = $( '<input/>' ).appendTo( 'body' ),
			init = sinon.spy(),
			onInitialShow = sinon.spy(),
			draw = sinon.spy(),
			expertExtender = new ExpertExtender( $input, [ {
				init: init,
				onInitialShow: onInitialShow,
				draw: draw
			} ] );

		$input.focus();
		expertExtender.init();
		// inputextender immediately extends if $input has focus
		// If, after focussing, $input does not have focus, we are running in phantomjs
		// or an unfocused firefox window. Force showing the extension, then.
		if( !$input.is( ':focus' ) ) {
			expertExtender._inputextender.showExtension();
		}

		window.setTimeout( function() {
			sinon.assert.calledOnce( init );
			sinon.assert.calledOnce( onInitialShow );
			sinon.assert.calledOnce( draw );

			$input.remove();

			QUnit.start();
		}, 0 );
	} );

} )(
	jQuery,
	jQuery.valueview.ExpertExtender,
	sinon,
	QUnit,
	typeof CompletenessTest !== 'undefined' ? CompletenessTest : null
);
