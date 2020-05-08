import { useMemo } from "react"
import matter from "gray-matter"
import algoliasearch from "algoliasearch/lite"
import { array, shape, string } from "prop-types"
import { useRouter } from "next/router"
import { getGithubPreviewProps, parseMarkdown, parseJson } from "next-tinacms-github"

import Head from "@components/head"
import Layout from "@components/layout"
import PostNavigation from "@components/post-navigation"
import PostFeedback from "@components/post-feedback"
import SideNav from "@components/side-nav"
import DocWrapper from "@components/doc-wrapper"
import MarkdownWrapper from "@components/markdown-wrapper"
import Toc from "@components/Toc"

import { parseNestedDocsMds, flatDocs, createToc } from "@utils"
import { useFormEditDoc, useCreateChildPage } from "@hooks"

import { useCMS } from "tinacms"
import { useInlineForm, InlineForm, InlineTextField, InlineWysiwyg } from "react-tinacms-inline"
import InlineEditingControls from "@components/inline-controls"

const DocTemplate = (props) => {
  const router = useRouter()
  const cms = useCMS()

  // const { deactivate, activate } = useInlineForm()

  // function handleInlineEdit() {
  //   props.preview ? activate() : deactivate()
  // }
  // useMemo(handleInlineEdit, [props.preview] )

  // debugger;

  // console.log({allnested: props.allNestedDocs})
  // useCreateChildPage(props.allNestedDocs)
  // console.log({file: props.file})
  const [data, form] = useFormEditDoc(props.file)
  // console.log({ data })

  if (!form) return null
  return (
    <Layout showDocsSearcher splitView preview={props.preview} form={form}>
      <Head title={data.frontmatter.title} />
      <SideNav
        allNestedDocs={props.allNestedDocs}
        currentSlug={router.query.slug}
        groupIn={data.frontmatter.groupIn}
      />
      <DocWrapper preview={props.preview}>
        {process.env.NODE_ENV !== "production" && <InlineEditingControls />}
        <main>
          <h1>
            <InlineTextField name="frontmatter.title" />
          </h1>
          {/* {props.Alltocs.length > 0 && <Toc tocItems={props.Alltocs} />} */}
          <InlineWysiwyg
            // TODOL: fix this
            // imageProps={{
            //   async upload(files) {
            //     const directory = "/public/images/"

            //     let media = await cms.media.store.persist(
            //       files.map((file) => {
            //         return {
            //           directory,
            //           file,
            //         }
            //       })
            //     )
            //     return media.map((m) => `/images/${m.filename}`)
            //   },
            //   previewUrl: (str) => str,
            // }}
            name="markdownBody"
          >
            <MarkdownWrapper source={data.markdownBody} />
          </InlineWysiwyg>
        </main>

        <PostNavigation allNestedDocs={props.allNestedDocs} />
        <PostFeedback />
      </DocWrapper>
    </Layout>
  )
}

export const getStaticProps = async function ({ preview, previewData, query, params }) {
  const { slug } = params
  console.log({ fileRelativePath: `docs/${slug.join("/")}.md` })

  if (preview) {
    const test = await getGithubPreviewProps({
      ...previewData,
      fileRelativePath: "docs/config.json",
      parse: parseJson,
    })
    console.log(test.props.file)
    const previewProps = await getGithubPreviewProps({
      ...previewData,
      fileRelativePath: `docs/${slug.join("/")}.md`,
      parse: parseMarkdown,
    })

    // console.log({ previewProps })
    // console.log(previewProps.props.file)

    return {
      props: {
        ...previewProps.props,
        // allNestedDocs,
        // Alltocs,
      },
    }
  }

  const content = await import(`@docs/${slug.join("/")}.md`)
  console.log({ content })
  const data = matter(content.default)
  const allNestedDocs = ((context) => parseNestedDocsMds(context))(
    //eslint-disable-next-line
    require.context("@docs", true, /\.md$/)
  )

  // Create Toc
  // TODO: this works only on SSR, it doesn't work for client routing
  let Alltocs = ""

  if (typeof window === "undefined") {
    Alltocs = createToc(data.content)
  }

  console.log(JSON.stringify(allNestedDocs))

  return {
    props: {
      file: {
        fileRelativePath: `./docs/${slug.join("/")}.md`,
        data: {
          frontmatter: data.data,
          markdownBody: data.content,
        },
      },
      allNestedDocs,
      Alltocs,
      preview: false,
      error: null,
    },
  }
}

export const getStaticPaths = async function () {
  const fg = require("fast-glob")
  const contentDir = "docs/"
  const files = await fg(`${contentDir}**/*.md`)
  return {
    fallback: false,
    paths: files
      // .filter(file => !file.endsWith('index.md'))
      .map((file) => {
        const path = file.substring(contentDir.length, file.length - 3)
        return { params: { slug: path.split("/") } }
      }),
  }
}

// DocTemplate.propTypes = {
//   allNestedDocs: array,
//   markdownFile: shape(),
//   Alltocs: string,
// }

export default DocTemplate
