# frozen_string_literal: true

module QRnegie
  # Makes qrnegie_tag available in Rails views
  class Railtie < ::Rails::Railtie
    initializer 'qrnegie.helper' do
      ActiveSupport.on_load(:action_view) { include QRnegie::Helper }
    end
  end
end
