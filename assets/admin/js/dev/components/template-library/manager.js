var TemplateLibraryLayoutView = require( 'elementor-templates/views/layout' ),
	TemplateLibraryCollection = require( 'elementor-templates/collections/templates' ),
	TemplateLibraryManager;

TemplateLibraryManager = function() {
	var self = this,
		modal,
		deleteDialog,
		errorDialog,
		layout,
		templatesCollection;

	var initLayout = function() {
		layout = new TemplateLibraryLayoutView();
	};

	this.deleteTemplate = function( templateModel ) {
		var dialog = self.getDeleteDialog();

		dialog.onConfirm = function() {
			layout.showLoadingView();

			elementor.ajax.send( 'delete_template', {
				data: {
					type: templateModel.get( 'type' ),
					item_id: templateModel.get( 'id' )
				},
				success: function() {
					templatesCollection.remove( templateModel );

					self.showTemplates();
				}
			} );
		};

		dialog.show();
	};

	this.importTemplate = function( templateModel ) {
		layout.showLoadingView();

		elementor.ajax.send( 'get_template_content', {
			data: {
				type: templateModel.get( 'type' ),
				post_id: elementor.config.post_id,
				item_id: templateModel.get( 'id' )
			},
			success: function( data ) {
				self.getModal().hide();

				elementor.getRegion( 'sections' ).currentView.addChildModel( data );
			},
			error: function( data ) {
				self.showErrorDialog( data.message );
			}
		} );
	};

	this.getDeleteDialog = function() {
		if ( ! deleteDialog ) {
			deleteDialog = elementor.dialogsManager.createWidget( 'confirm', {
				id: 'elementor-template-library-delete-dialog',
				headerMessage: elementor.translate( 'delete_template' ),
				message: elementor.translate( 'delete_template_confirm' )
			} );
		}

		return deleteDialog;
	};

	this.getErrorDialog = function() {
		if ( ! errorDialog ) {
			errorDialog = elementor.dialogsManager.createWidget( 'alert', {
				id: 'elementor-template-library-error-dialog',
				headerMessage: elementor.translate( 'an_error_occurred' )
			} );
		}

		return errorDialog;
	};

	this.getModal = function() {
		if ( ! modal ) {
			modal = elementor.dialogsManager.createWidget( 'elementor-modal', {
				id: 'elementor-template-library-modal',
				closeButton: false
			} );
		}

		return modal;
	};

	this.getLayout = function() {
		return layout;
	};

	this.getTemplatesCollection = function() {
		return templatesCollection;
	};

	this.requestRemoteTemplates = function( callback, forceUpdate ) {
		if ( templatesCollection && ! forceUpdate ) {
			if ( callback ) {
				callback();
			}

			return;
		}

		elementor.ajax.send( 'get_templates', {
			success: function( data ) {
				templatesCollection = new TemplateLibraryCollection( data );

				if ( callback ) {
					callback();
				}
			}
		} );
	};

	this.startModal = function( onModalReady ) {
		self.getModal().show();

		self.setTemplatesType( 'remote' );

		if ( ! layout ) {
			initLayout();
		}

		layout.showLoadingView();

		self.requestRemoteTemplates( function() {
			if ( onModalReady ) {
				onModalReady();
			}
		} );
	};

	this.setTemplatesType = function( type, trigger ) {
		var channel = elementor.channels.templates;

		channel.reply( 'filter:type', type );

		if ( trigger ) {
			channel.trigger( 'filter:change' );
		}
	};

	this.showTemplates = function() {
		layout.showTemplatesView( templatesCollection );
	};

	this.showErrorDialog = function( errorMessage ) {
		self.getErrorDialog()
		    .setMessage( elementor.translate( 'templates_request_error' ) + '<div id="elementor-template-library-error-info">' + errorMessage + '</div>' )
		    .show();
	};
};

module.exports = new TemplateLibraryManager();
