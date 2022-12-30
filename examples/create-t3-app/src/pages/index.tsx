import { type NextPage } from "next";
import Link from "next/link";

import { trpc } from "../utils/trpc";

const Home: NextPage = () => {
  const { data: downloadPrivateObjectData } =
    trpc.uploadjoy.downloadPrivateObject.useQuery({
      keys: ["private.png"],
    });
  const { data: uploadObjectsData } = trpc.uploadjoy.uploadObjects.useQuery();
  const { data: mpUploadData } =
    trpc.uploadjoy.multipartUploadObject.useQuery();
  const abortMultiPartUpload =
    trpc.uploadjoy.abortMultiPartUpload.useMutation();

  return (
    <>
      <main></main>
    </>
  );
};

export default Home;
