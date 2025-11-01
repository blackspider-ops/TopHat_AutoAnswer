# Contributing to TopHat AutoJoin & AutoAnswer

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Chrome version and OS
- Console logs (if applicable)

### Suggesting Features

Feature requests are welcome! Please include:
- Clear description of the feature
- Use case and benefits
- Potential implementation approach (optional)

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly
4. **Commit with clear messages**
   ```bash
   git commit -m "Add: description of your changes"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

## Development Setup

1. Clone the repository
2. Load unpacked extension in Chrome (`chrome://extensions/`)
3. Enable Developer Mode
4. Make changes and reload extension to test

## Code Style

- Use consistent indentation (2 spaces)
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small
- Use async/await for promises

## Testing

Before submitting:
- Test all features manually
- Check console for errors
- Test on different TopHat pages
- Verify alarms trigger correctly
- Test with multiple classes

## Debug Mode

Enable debug logging for development:
```javascript
// In background.js and content.js
const DEBUG = true;
```

## Areas for Contribution

### High Priority
- Support for other question types (text input, true/false)
- Better error handling and recovery
- Improved question detection algorithms
- Performance optimizations

### Medium Priority
- Statistics and analytics dashboard
- Export/import settings
- Notification system
- Dark mode UI

### Low Priority
- Keyboard shortcuts
- Custom answer strategies
- Multi-language support

## TopHat DOM Changes

If TopHat updates their page structure:
1. Update selectors in `content.js`
2. Test thoroughly
3. Document changes in commit message
4. Update version in `manifest.json`

## Questions?

Feel free to open an issue for any questions about contributing!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
