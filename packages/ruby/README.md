# QRnegie for Ruby and Rails

QR codes from [QRnegie](https://qrnegie.andrew.cmu.edu/) in Ruby code and
Rails views, in Carnegie Mellon styles, as SVG or PNG. The gem only builds
image addresses: QRnegie draws each code when someone loads it, and the gem
never calls the service itself.

The gem lives in the QRnegie repository's `packages/ruby/`. Each QRnegie
release publishes it at the same version.

## Install

```ruby
gem 'cmu-web-qrnegie', '~> 0.3'
```

## In Rails Views

Rails views get `qrnegie_tag`. It takes the text or link to encode, alt
text and QRnegie's options; anything else goes to `image_tag`:

```erb
<%= qrnegie_tag 'https://www.cmu.edu/', alt: 'QR code for cmu.edu' %>
<%= qrnegie_tag event_url(@event), alt: 'QR code for this event', style: :mosaic, width: 1024 %>
<%= qrnegie_tag 'https://www.cmu.edu/', alt: 'QR code for cmu.edu', below: 'Scan Me', class: 'qr' %>
```

Alt text is required. Say where the code goes, not that it's a QR code
alone.

## In Ruby

```ruby
require 'cmu-web-qrnegie'

QRnegie.url('https://www.cmu.edu/')
QRnegie.url('https://www.cmu.edu/', style: 'kraus-campo', width: 1024, format: :png)
QRnegie.url('https://www.cmu.edu/', style: :icon, icon: 'calendar-event')
```

## Options

| Option             | Gives                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| `style:`           | A style from QRnegie's Styles page, e.g., `mosaic`; Basic Scotty if left out |
| `width:`           | The image's width in pixels, up to 2048; 512 if left out                     |
| `above:`, `below:` | A line of text above or below the code, up to 40 characters each             |
| `icon:`            | Center Icon's icon, a Bootstrap Icons name such as `wifi`                    |
| `format:`          | `:svg` (the default) or `:png`                                               |

The gem checks the text, width, lines and format; QRnegie checks the rest
and explains any address it can't draw. The
[Styles](https://qrnegie.andrew.cmu.edu/styles.html) and
[Reference](https://qrnegie.andrew.cmu.edu/reference.html) pages list every
style and the smallest width each one takes. Detailed styles start at 1024.

To point at a local copy of QRnegie, set the host once:

```ruby
QRnegie.host = 'http://127.0.0.1:3000'
```

## Work on the Gem

```bash
cd packages/ruby
bundle install
bundle exec rake test build
```

`rake version` copies the app's license and its version from
`package.json` into the gem; `rake clean` removes them and the build.
