# frozen_string_literal: true

require 'minitest/autorun'
require 'action_view'
require_relative '../lib/cmu-web-qrnegie'

class HelperTest < Minitest::Test
  class View
    include ActionView::Helpers::AssetTagHelper
    include QRnegie::Helper
  end

  def tag(...)
    View.new.qrnegie_tag(...)
  end

  def test_an_image_tag_with_alt_text_and_width
    html = tag('https://www.cmu.edu/', alt: 'QR code for cmu.edu', style: :mosaic, width: 1024, class: 'qr')
    assert_includes html, 'src="https://qrnegie.andrew.cmu.edu/qr.svg?text=https%3A%2F%2Fwww.cmu.edu%2F&amp;style=mosaic&amp;width=1024"'
    assert_includes html, 'alt="QR code for cmu.edu"'
    assert_includes html, 'width="1024"'
    refute_includes html, 'height='
    assert_includes html, 'class="qr"'
  end

  def test_the_default_width
    assert_includes tag('hello', alt: 'A code'), 'width="512"'
  end

  def test_alt_text_is_required
    assert_raises(ArgumentError) { tag('hello') }
  end
end
