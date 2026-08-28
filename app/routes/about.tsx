import { Link } from "react-router";
import Navbar from "~/components/Navbar";

export const meta = () => [
  { title: "Breezume | About the Developer" },
  {
    name: "description",
    content: "Meet the developer behind Breezume",
  },
];

const About = () => (
  <main className="bg-[url('/images/bg-main.png')] bg-cover min-h-screen">
    <Navbar />
    <section className="main-section py-16">
      <article className="w-full max-w-4xl rounded-2xl bg-white/95 border border-indigo-100 shadow-lg p-6 sm:p-10 flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            About the developer
          </p>
          <h1 className="!text-4xl sm:!text-5xl">Hi, I'm Brady</h1>
          <p className="text-lg text-gray-600 leading-8">
            I’m a software developer and current college student completing my
            Bachelor of Science in Computer Science at Illinois State
            University. I’m continuing to strengthen my skills as I work toward
            becoming a full-stack software engineer.
          </p>
          <p className="text-lg text-gray-600 leading-8">
            Thank you for taking the time to check out Breezume!
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="!text-2xl !text-gray-900 font-bold">
            Why I Built Breezume
          </h2>
          <p className="text-gray-600 leading-7">
            I created Breezume both to grow as a web developer and to make the
            often exhausting job-search process a little easier. Many tools
            focus on only one part of an application, so I wanted to build a
            single experience that could support job seekers throughout more of
            the process.
          </p>
          <p className="text-gray-600 leading-7">
            I was also frustrated that many useful career tools place nearly
            every feature behind a premium subscription. Breezume is designed to
            give users generous access before asking them to pay for additional
            AI usage. Any usage-based payments support the Puter.js platform,
            whose tools made Breezume possible and gave me an excellent library
            to learn from.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="!text-2xl !text-gray-900 font-bold">Let’s Connect</h2>
          <p className="text-gray-600 leading-7">
            Feel free to explore my work, follow my progress, or send me a
            message through any of the links below.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* <a href="#" className="primary-button w-fit">
              View My Portfolio
            </a> */}
            <a
              href="https://github.com/bebinko"
              className="back-button w-fit cursor-pointer hover:bg-gray-50 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/bbinko"
              className="back-button w-fit cursor-pointer hover:bg-gray-50 transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </section>

        <div className="border-t border-gray-100 pt-6">
          <Link
            to="/"
            className="back-button w-fit cursor-pointer hover:bg-gray-50 transition-colors"
          >
            ← Back to Breezume
          </Link>
        </div>
      </article>
    </section>
  </main>
);

export default About;
