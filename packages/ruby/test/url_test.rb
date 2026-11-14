# frozen_string_literal: true

require 'minitest/autorun'
require 'json'
require_relative '../lib/cmu-web-qrnegie'

class UrlTest < Minitest::Test
  BASE = 'https://qrnegie.andrew.cmu.edu'
  CMU = 'https://www.cmu.edu/'

  def teardown
    QRnegie.host = nil
  end

  def test_text_alone
    assert_equal "#{BASE}/qr.svg?text=https%3A%2F%2Fwww.cmu.edu%2F", QRnegie.url(CMU)
  end

  def test_style_width_and_text_above_and_below
    assert_equal "#{BASE}/qr.png?text=https%3A%2F%2Fwww.cmu.edu%2F&style=kraus-campo&width=1024&above=Scan+Me&below=Visit+CMU",
                 QRnegie.url(CMU, style: 'kraus-campo', width: 1024, above: 'Scan Me', below: 'Visit CMU', format: :png)
  end

  def test_center_icon
    assert_equal "#{BASE}/qr.svg?text=https%3A%2F%2Fwww.cmu.edu%2F&style=icon&icon=wifi", QRnegie.url(CMU, style: :icon, icon: 'wifi')
  end

  def test_blank_options_are_left_out
    assert_equal "#{BASE}/qr.svg?text=hello", QRnegie.url('hello', above: ' ', below: nil)
  end

  def test_another_host
    QRnegie.host = 'http://127.0.0.1:3000/'
    assert_equal 'http://127.0.0.1:3000/qr.svg?text=hello', QRnegie.url('hello')
  end

  def test_rejects_bad_text_widths_lines_and_formats
    ['', ' ', 'x' * 1025].each { |text| assert_raises(ArgumentError) { QRnegie.url(text) } }
    [0, 2049, 1.5, '512'].each { |width| assert_raises(ArgumentError) { QRnegie.url(CMU, width: width) } }
    assert_raises(ArgumentError) { QRnegie.url(CMU, below: 'x' * 41) }
    assert_raises(ArgumentError) { QRnegie.url(CMU, format: :jpg) }
  end

  def test_version_matches_the_app
    app = JSON.parse(File.read(File.expand_path('../../../package.json', __dir__))).fetch('version')
    assert_equal app, QRnegie::VERSION
  end
end
