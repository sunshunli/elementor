<?php
namespace Elementor\Testing;

use Elementor\Core\Wp_Api;
use Elementor\Plugin;
use Elementor\Testing\Traits\Kit_Trait;
use Elementor\Testing\Traits\Auth_Helpers;
use Elementor\Testing\Traits\Base_Elementor;
use Elementor\Testing\Traits\Extra_Assertions;

class Elementor_Test_Base extends \WP_UnitTestCase {
	use Base_Elementor, Extra_Assertions, Auth_Helpers, Kit_Trait;

	public function setUp() {
		parent::setUp();

		$this->create_default_kit();

		set_current_screen( 'dashboard' );
	}

	public function tearDown() {
		parent::tearDown();

		Plugin::$instance->editor->set_edit_mode( false );
		Plugin::$instance->documents->restore_document();
		Plugin::$instance->editor->set_edit_mode( false );
		Plugin::$instance->wp = new Wp_Api();
	}
}
