# frozen_string_literal: true

module QRnegie
  # A view helper for Rails, included in every view by the Railtie
  module Helper
    OPTIONS = %i[style width above below icon format].freeze

    # <%= qrnegie_tag 'https://www.cmu.edu/', alt: 'QR code for cmu.edu', style: :mosaic %>
    # Takes QRnegie's options, and image_tag's for everything else. Alt text
    # is required; say where the code goes.
    def qrnegie_tag(text, alt:, **options)
      code = options.slice(*OPTIONS)
      html = options.except(*OPTIONS)
      # Text above or below makes the image taller, so only the width is known
      image_tag(QRnegie.url(text, **code), alt: alt, width: code.fetch(:width, 512), **html)
    end
  end
end
