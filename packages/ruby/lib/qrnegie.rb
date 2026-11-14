# frozen_string_literal: true

require 'uri'
require_relative 'qrnegie/version'

# Addresses for QRnegie's QR code images (https://qrnegie.andrew.cmu.edu/).
# Only builds URLs; it never calls the service, which draws each code when
# it's requested and checks the options itself.
module QRnegie
  # The longest text a code holds, in UTF-8 bytes, and the longest line of
  # text above or below it, in characters
  TEXT_LIMIT = 1024
  LABEL_LIMIT = 40
  MAX = 2048
  FORMATS = %i[svg png].freeze

  class << self
    # The service the addresses point to; set it for a local copy
    attr_writer :host

    def host
      @host || 'https://qrnegie.andrew.cmu.edu'
    end

    # QRnegie.url('https://www.cmu.edu/', style: :mosaic, width: 1024)
    # QRnegie.url('https://www.cmu.edu/', below: 'Scan Me', format: :png)
    # Left out, the style is Basic Scotty and the width 512 pixels.
    def url(text, style: nil, width: nil, above: nil, below: nil, icon: nil, format: :svg)
      check(text, width, above, below, format)
      query = { text: text, style: style, width: width, above: above, below: below, icon: icon }
              .reject { |_, value| value.nil? || value.to_s.strip.empty? }
      "#{host.chomp('/')}/qr.#{format}?#{URI.encode_www_form(query)}"
    end

    private

    def check(text, width, above, below, format)
      if text.to_s.strip.empty? || text.to_s.bytesize > TEXT_LIMIT
        raise ArgumentError, "QRnegie text must have 1 to #{TEXT_LIMIT} UTF-8 bytes"
      end
      if width && !(width.is_a?(Integer) && width.between?(1, MAX))
        raise ArgumentError, "QRnegie widths are whole numbers up to #{MAX}, not #{width.inspect}"
      end
      if [above, below].any? { |line| line.to_s.length > LABEL_LIMIT }
        raise ArgumentError, "Keep QRnegie text above or below the code to #{LABEL_LIMIT} characters"
      end
      return if FORMATS.include?(format&.to_sym)

      raise ArgumentError, "QRnegie format must be one of #{FORMATS.join(', ')}"
    end
  end
end

require_relative 'qrnegie/helper'
require_relative 'qrnegie/railtie' if defined?(Rails::Railtie)
