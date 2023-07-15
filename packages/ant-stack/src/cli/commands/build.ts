import { detectConstruct } from "../../cdk";

export async function build() {
  console.log("here");

  const construct = await detectConstruct();

  console.log("construct: ", construct);
}
