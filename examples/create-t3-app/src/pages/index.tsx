import { type NextPage } from "next";
import { StandardDropzone } from "../components/StandardDropzone";
import { MultipartDropzone } from "../components/MultipartDropzone";

const Home: NextPage = () => {
  return (
    <>
      <main className="dark h-full bg-zinc-900 text-zinc-50 p-10">
        <h1 className="text-xl font-semibold text-center mb-2">
          Uploadjoy create-t3-app dropzone examples with react-dropzone + axios
        </h1>
        <p className="text-center mb-8">
          Open DevTools to see logs and learn how these components work
        </p>
        <div className="flex gap-32 justify-center">
          <StandardDropzone />
          <MultipartDropzone />
        </div>
      </main>
    </>
  );
};

export default Home;
