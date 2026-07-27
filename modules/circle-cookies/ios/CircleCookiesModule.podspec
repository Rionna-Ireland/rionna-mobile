Pod::Spec.new do |s|
  s.name           = 'CircleCookiesModule'
  s.version        = '0.1.0'
  s.summary        = 'Clears live WebView cookies on sign-out (S6-04).'
  s.description    = 'Local Expo module: WKWebsiteDataStore cookie clear for Circle session invalidation.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Rionna'
  s.homepage       = 'https://rionna.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility (matches the Expo module podspec template).
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
