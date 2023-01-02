import { type NextPage } from "next";
import { Dropzone } from "../components/Dropzone";

const Home: NextPage = () => {
  return (
    <>
      <main>
        <Dropzone />
      </main>
    </>
  );
};

export default Home;
