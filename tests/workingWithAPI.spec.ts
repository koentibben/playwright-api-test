import { test, expect } from '@playwright/test';
import tags from '../test-data/tags.json'

test.beforeEach(async ({ page }) => {
  // intercept request and fulfill with own JSON response
  await page.route('*/**/api/tags', async route => {
    await route.fulfill({
      body: JSON.stringify(tags)
    })
  })

  await page.goto('https://angular.realworld.io/');
})

test('has title', async ({ page }) => {
  // intercept request, fetch and update API response with own adjustments
  await page.route('*/**/api/articles*', async route => {
    const response = await route.fetch()
    const responseBody = await response.json()
    responseBody.articles[0].title = "This is a test title, mocked by Playwright"
    responseBody.articles[0].description = "This is a test description, mocked by Playwright"

    await route.fulfill({
      body: JSON.stringify(responseBody)
    })
  })

  await page.getByText('Global Feed').click()
  await expect(page.locator('.navbar-brand')).toHaveText('conduit')
  await expect(page.locator('app-article-list h1').first()).toContainText('This is a test title, mocked by Playwright')
  await expect(page.locator('app-article-list p').first()).toContainText('This is a test description, mocked by Playwright')
});

test('delete article', async ({ page, request }) => {
  const articleResponse = await request.post('https://api.realworld.io/api/articles/', {
    data: {
      "article": {
        "tagList": [],
        "title": "Test title",
        "description": "Test description",
        "body": "Test body"
      }
    }
  })

  expect(articleResponse.status()).toEqual(201)

  await page.getByText('Global Feed').click()
  await page.getByText('Test title').click()
  await page.getByRole('button', { name: "Delete article" }).first().click()
  await page.getByText('Global Feed').click()

  await expect(page.locator('app-article-list h1').first()).not.toContainText('Test title')
})

test('create article', async ({ page, request }) => {
  await page.getByText('New Article').click()
  await page.getByRole('textbox', { name: "Article Title" }).fill('Playwright is awesome <3')
  await page.getByRole('textbox', { name: "What's this article about?" }).fill('About Playwright')
  await page.getByRole('textbox', { name: "Write your article (in markdown)" }).fill('We like to use Playwright for automation')
  await page.getByRole('button', { name: "Publish Article" }).click()
  const articleResponse = await page.waitForResponse('https://api.realworld.io/api/articles/')
  const articleResponseBody = await articleResponse.json()
  const slugId = articleResponseBody.article.slug

  await expect(page.locator('.article-page h1')).toContainText('Playwright is awesome <3')
  await page.getByText('Home').click()
  await page.getByText('Global Feed').click()
  await expect(page.locator('app-article-list h1').first()).toContainText('Playwright is awesome <3', { timeout: 20000 })

  const deleteArticleResponse = await request.delete(`https://api.realworld.io/api/articles/${slugId}`)
  expect(deleteArticleResponse.status()).toEqual(204)
})