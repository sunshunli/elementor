import BackwardsCompatibility from './backwards-compatibility';
import * as Commands from './commands';

export default class Component extends BackwardsCompatibility {
	__construct( args = {} ) {
		super.__construct( args );

		this.autoSaveTimer = null;
		this.autoSaveInterval = elementor.config.autosave_interval * 1000;

		elementorCommon.elements.$window.on( 'beforeunload', () => {
			if ( this.isEditorChanged() ) {
				return elementor.translate( 'before_unload_alert' );
			}
		} );
	}

	getNamespace() {
		return 'document/save';
	}

	defaultCommands() {
		return {
			auto: ( args ) => ( new Commands.Auto( args ).run() ),
			default: ( args ) => ( new Commands.Default( args ).run() ),
			discard: ( args ) => ( new Commands.Discard( args ).run() ),
			draft: ( args ) => ( new Commands.Draft( args ).run() ),
			pending: ( args ) => ( new Commands.Pending( args ).run() ),
			publish: ( args ) => ( new Commands.Publish( args ).run() ),
			update: ( args ) => ( new Commands.Update( args ).run() ),
		};
	}

	saveEditor( options ) {
		const document = options.document || elementor.documents.getCurrent();

		if ( document.isSaving ) {
			return;
		}

		options = Object.assign( {
			status: 'draft',
			onSuccess: null,
		}, options );

		const container = document.container,
			elements = container.model.get( 'elements' ).toJSON( { remove: [ 'default', 'editSettings', 'defaultEditSettings' ] } ),
			settings = container.settings.toJSON( { remove: [ 'default' ] } ),
			oldStatus = container.settings.get( 'post_status' ),
			statusChanged = oldStatus !== options.status;

		this.trigger( 'before:save', options )
			.trigger( 'before:save:' + options.status, options );

		document.isSaving = true;
		document.isChangedDuringSave = false;

		settings.post_status = options.status;

		elementorCommon.ajax.addRequest( 'save_builder', {
			data: {
				status: options.status,
				elements: elements,
				settings: settings,
			},

			success: ( data ) => this.onSaveSuccess( data, oldStatus, statusChanged, elements, options, document ),
			error: ( data ) => this.onSaveError( data, options, document ),
		} );

		this.trigger( 'save', options );
	}

	startTimer( hasChanges ) {
		clearTimeout( this.autoSaveTimer );

		if ( hasChanges ) {
			this.autoSaveTimer = setTimeout( () => {
				$e.run( 'document/save/auto' );
			}, this.autoSaveInterval );
		}
	}

	setFlagEditorChange( status ) {
		const document = elementor.documents.getCurrent();

		if ( status && document.isSaving ) {
			document.isChangedDuringSave = true;
		}

		this.startTimer( status );

		elementor.channels.editor
			.reply( 'status', status )
			.trigger( 'status:change', status );
	}

	isEditorChanged() {
		return ( true === elementor.channels.editor.request( 'status' ) );
	}

	onSaveSuccess( data, oldStatus, statusChanged, elements, options, document ) {
		this.onAfterAjax( document );

		if ( 'autosave' !== options.status ) {
			if ( statusChanged ) {
				elementor.settings.page.model.set( 'post_status', options.status );
			}

			// Notice: Must be after update page.model.post_status to the new status.
			if ( ! document.isChangedDuringSave ) {
				elementor.saver.setFlagEditorChange( false );
			}
		}

		if ( data.config ) {
			// TODO: Move to es6
			jQuery.extend( true, elementor.config.document, data.config );
		}

		elementor.config.document.elements = elements;

		elementor.channels.editor.trigger( 'saved', data );

		this.trigger( 'after:save', data )
			.trigger( 'after:save:' + options.status, data );

		if ( statusChanged ) {
			this.trigger( 'page:status:change', options.status, oldStatus );
		}

		if ( _.isFunction( options.onSuccess ) ) {
			options.onSuccess.call( this, data );
		}
	}

	onSaveError( data, options, document ) {
		this.onAfterAjax( document );

		this.trigger( 'after:saveError', data )
			.trigger( 'after:saveError:' + options.status, data );

		let message;

		if ( _.isString( data ) ) {
			message = data;
		} else if ( data.statusText ) {
			message = elementor.createAjaxErrorMessage( data );

			if ( 0 === data.readyState ) {
				message += ' ' + elementor.translate( 'saving_disabled' );
			}
		} else if ( data[ 0 ] && data[ 0 ].code ) {
			message = elementor.translate( 'server_error' ) + ' ' + data[ 0 ].code;
		}

		elementor.notifications.showToast( {
			message: message,
		} );
	}

	onAfterAjax( document ) {
		document.isSaving = false;
	}
}
