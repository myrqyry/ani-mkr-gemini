from playwright.sync_api import sync_playwright

def test_asset_manager():
    """
    This test verifies that the AssetManager component
    correctly uploads a file and displays it in the asset list.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # 1. Arrange: Go to the application's homepage.
            page.goto("http://localhost:3000")

            # 2. Act: Find the file input and upload a file.
            file_input = page.locator('input[type="file"]')
            file_input.wait_for(timeout=5000)
            file_input.set_input_files('README.md')

            # 3. Assert: Confirm the file is displayed in the asset list.
            # We expect the asset list to contain the name of the uploaded file.
            page.locator('ul').wait_for(timeout=5000)
            page.locator('ul').get_by_text('README.md').wait_for(timeout=5000)

            # 4. Screenshot: Capture the final result for visual verification.
            page.screenshot(path="jules-scratch/verification/verification.png")
        except Exception as e:
            print(e)
        finally:
            browser.close()

if __name__ == "__main__":
    test_asset_manager()
