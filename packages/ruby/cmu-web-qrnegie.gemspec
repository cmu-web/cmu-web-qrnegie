# frozen_string_literal: true

require_relative 'lib/qrnegie/version'

Gem::Specification.new do |spec|
  spec.name = 'cmu-web-qrnegie'
  spec.version = QRnegie::VERSION
  spec.authors = ['Carnegie Mellon University']
  spec.summary = 'QR code image addresses from QRnegie, for Ruby and Rails'
  spec.description = 'Builds addresses for QRnegie, which draws QR codes in Carnegie Mellon styles as SVG or PNG. Includes a Rails view helper.'
  spec.homepage = 'https://qrnegie.andrew.cmu.edu/'
  spec.license = 'BSD-3-Clause'
  spec.required_ruby_version = '>= 3.2'

  # LICENSE and VERSION are copied in from the app by rake version
  spec.files = Dir['lib/**/*.rb'] + %w[LICENSE README.md VERSION]
  spec.require_paths = ['lib']
  spec.metadata = {
    'source_code_uri' => 'https://github.com/cmu-web/cmu-web-qrnegie',
    'documentation_uri' => 'https://github.com/cmu-web/cmu-web-qrnegie/tree/main/packages/ruby#readme',
    'bug_tracker_uri' => 'https://github.com/cmu-web/cmu-web-qrnegie/issues',
    'rubygems_mfa_required' => 'true'
  }
end
