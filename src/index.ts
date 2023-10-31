interface IKuaiKanApi<T> {
  hits: T
  code: number
  message: string
}

interface IKuaiKanSearchApi<T>{
  data: T
  code: number
  message: string
}

interface IKuaiKanFilterReturn {
  topicCategories: IKuaiKanTag[]
  topicMessageList:IMangaCategoryListItem[]
}

interface IKuaiKanTag{
  title: string
  tagId: number
}

interface IMangaCategoryListItem {
  id: number
  title: string
  description: string
  vertical_image_url: string
}

interface IKuaiKanSearchMangaHit {
  id: number
  title: string
  description: string
  vertical_image_url: string
  comics: {
    id: number
    title: string
    is_free: boolean
  }[]
}

interface IKuaiKanMangaSeason {
  id: number
  title: string
  description: string
  vertical_image_url: string
  comics: {
    id: number
    title: string
    locked: boolean
    cover_image_url: string
  }[]
}

type MangaListFilterOptions = Array<{
  label: string,
  name: string | number,
  options: Array<{ label: string, value: string }>
}>

/**
 * This function will be invoked in manga list page.
 * The returned data will be used as the filter options for the manga list.
 */
async function setMangaListFilterOptions () {
  const url = 'https://www.kuaikanmanhua.com/search/mini/topic/multi_filter?page=1&size=48&tag_id=0&update_status=0&pay_status=0&label_dimension_origin=0&sort=1'

  try {
    const result: MangaListFilterOptions = [
      { label: '题材', name: 'tag_id', options: [{ label: '全部', value: '0' }] },
      { label: '区域', name: 'label_dimension_origin', options: [{ label: '全部', value: '0' }, { label: '国漫', value: '2' }, { label: '韩漫', value: '3' }, { label: '日漫', value: '4' }] },
      { label: '进度', name: 'update_status', options: [{ label: '全部', value: '0' }, { label: '连载中', value: '0' }, { label: '已完结', value: '0' }] },
      { label: '收费', name: 'pay_status', options: [{ label: '全部', value: '0' }, { label: '免费', value: '1' }, { label: '付费', value: '2' }] },
      { label: '排序', name: 'sort', options: [{ label: '推荐', value: '1' }, { label: '最火热', value: '2' }, { label: '新上架', value: '3' }] }
    ]

    const rawResponse = await window.Rulia.httpRequest({
      url,
      method: 'GET'
    })

    const response = JSON.parse(rawResponse) as IKuaiKanApi<IKuaiKanFilterReturn>

    if (response.code !== 200) {
      throw new Error('SERVER_RESPONSE_CODE_' + response.message)
    }

    if (response.hits.topicCategories.length > 0) {
      response.hits.topicCategories.forEach(item => {
        result[0].options.push({
          label: item.title,
          value: item.tagId.toString()
        })
      })
    }

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithResult([])
  }
}

async function getMangaListByCategory (page: number, pageSize: number, filterOptions: Record<string, string>) {
  const url = 'https://www.kuaikanmanhua.com/search/mini/topic/multi_filter'
  try {
    const payload = new URLSearchParams({
      tag_id: '0',
      label_dimension_origin: '0',
      update_status: '0',
      sort: '1',
      pay_status: '0'
    })

    payload.append('page', page.toString())
    payload.append('size', pageSize.toString())

    if (filterOptions.tag_id) {
      payload.set('tag_id', filterOptions.tag_id)
    }
    if (filterOptions.label_dimension_origin) {
      payload.set('label_dimension_origin', filterOptions.label_dimension_origin)
    }
    if (filterOptions.update_status) {
      payload.set('update_status', filterOptions.update_status)
    }
    if (filterOptions.pay_status) {
      payload.set('pay_status', filterOptions.pay_status)
    }
    if (filterOptions.sort) {
      payload.set('sort', filterOptions.sort)
    }

    const rawResponse = await window.Rulia.httpRequest({
      url,
      method: 'GET',
      payload: payload.toString()
    })

    const response = JSON.parse(rawResponse) as IKuaiKanApi<IKuaiKanFilterReturn>
    if (response.code !== 200) {
      throw new Error('SERVER_RESPONSE_CODE_' + payload.toString())
    }

    const result: IGetMangaListResult = {
      list: response.hits.topicMessageList.map(item => ({
        title: item.title,
        url: `https://www.kuaikanmanhua.com/web/topic/${item.id}`,
        coverUrl: item.vertical_image_url
      }))
    }

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

async function getMangaListBySearching (page: number, pageSize: number, keyword: string) {
  const url = 'https://www.kuaikanmanhua.com/search/mini/topic/title_and_author'
  try {
    const payload = new URLSearchParams()
    payload.append('q', keyword)
    payload.append('page', page.toString())
    payload.append('size', pageSize.toString())

    const rawResponse = await window.Rulia.httpRequest({
      url,
      method: 'GET',
      payload: payload.toString()
    })

    const response = JSON.parse(rawResponse) as IKuaiKanApi<IMangaCategoryListItem[]>

    if (response.code !== 200) {
      throw new Error('SERVER_RESPONSE_CODE_' + response.code)
    }

    const result: IGetMangaListResult = {
      list: response.hits.map(item => ({
        title: item.title,
        url: `https://www.kuaikanmanhua.com/web/topic/${item.id}`,
        coverUrl: item.vertical_image_url
      }))
    }

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * Get manga list for manga list page.
 * This function will be invoked by Rulia in the manga list page.
 *
 * @param {string} page Page number. Please notice this arg will be passed from Rulia in string type.
 * @param {string} pageSize Page size. Please notice this arg will be passed from Rulia in string type.
 * @param {string} keyword The search keyword. It will empty when user doesn't provide it.
 * @param {string} rawFilterOptions The filter options.
 * @returns
 */
async function getMangaList (page: string, pageSize: string, keyword?: string, rawFilterOptions?: string) {
  const pageNum = parseInt(page)
  const pageSizeNum = parseInt(pageSize)

  if (keyword) {
    return await getMangaListBySearching(pageNum, pageSizeNum, keyword)
  }

  let filterOptions: Record<string, string> = {}
  if (rawFilterOptions) {
    try {
      filterOptions = JSON.parse(rawFilterOptions)
    } catch (error) {
      filterOptions = {}
    }
  }
  return await getMangaListByCategory(pageNum, pageSizeNum, filterOptions)
}

/**
 * Get data of a single manga.
 * This function will be invoked by Rulia when user clicks a certain manga
 * in the manga list page.
 *
 * @param {string} dataPageUrl This url is from the function "getMangaList".
 * @returns
 */
async function getMangaData (dataPageUrl: string) {
  // The url arg is something like 'https://www.kuaikanmanhua.com/web/topic/123'.

  const seasonIdMatchExp = /topic\/(\d+)$/ // Get season id from the url.
  const seasonIdMatch = dataPageUrl.match(seasonIdMatchExp)
  if (!seasonIdMatch || seasonIdMatch.length < 2) {
    window.Rulia.endWithException('NO_SEASON_ID_GOT')
    return
  }

  const seasonId = parseInt(seasonIdMatch[1])
  if (isNaN(seasonId)) {
    window.Rulia.endWithException('INVALID_SEASON_ID')
    return
  }

  const url = `https://www.kuaikanmanhua.com/v2/pweb/topic/${seasonId}`
  try {
    const rawResponse = await window.Rulia.httpRequest({
      url,
      method: 'GET'
    })

    const response = JSON.parse(rawResponse) as IKuaiKanSearchApi<{topic_info: IKuaiKanMangaSeason}>

    const episodeList = response.data.topic_info.comics
      .slice()
      .filter(item => !item.locked)

    const result: IGetMangaDataResult = {
      title: response.data.topic_info.title,
      description: response.data.topic_info.description,
      coverUrl: response.data.topic_info.vertical_image_url,
      chapterList: episodeList.map(item => ({
        title: item.title,
        url: `https://www.kuaikanmanhua.com/web/comic/${item.id}`
      }))
    }
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * Get image urls of all images from a single episode.
 *
 * @param {string} chapterUrl This url is from the result of the function 'getMangaData'.
 */
async function getChapterImageList (chapterUrl: string) {
  // The 'episodeUrl' is in the form of 'https://www.kuaikanmanhua.com/web/comic/462578'.

  const episodeIdMatchExp = /(\d+)$/
  const episodeIdMatch = chapterUrl.match(episodeIdMatchExp)
  const episodeId = parseInt(episodeIdMatch?.[0] ?? '')
  if (isNaN(episodeId)) {
    window.Rulia.endWithException('NO_EPISODE_ID_GOT')
    return
  }

  const url = `https://www.kuaikanmanhua.com/v2/pweb/comic/${episodeId}`
  try {
    const rawResponse = await window.Rulia.httpRequest({
      url,
      method: 'GET'
    })
    const response = await JSON.parse(rawResponse) as IKuaiKanSearchApi<{
      comic_info: {
        title: string
        comic_images: {
          url: string
          width: number
          height: number
        }[]
      }
    }>

    if (response.code !== 200) {
      throw new Error('SERVER_RESPONSE_CODE_' + response.code)
    }

    const imageList = response.data.comic_info.comic_images
    const result: IRuliaChapterImage[] = imageList.map(item => ({
      url: item.url,
      width: item.width,
      height: item.height
    }))
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * This function will be invoked when Rulia is going to download a image.
 *
 * Since some websites require special verification before downloading images,
 * you may need to implement these verification logics within this method.
 * If the target website doesn't need special logic, you can just directly
 * return the parameter 'url'.
 *
 * @param {string} path This url is from the result of the function 'getChapterImageList'
 */
async function getImageUrl (path: string) {
  try {
    window.Rulia.endWithResult(path)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}
