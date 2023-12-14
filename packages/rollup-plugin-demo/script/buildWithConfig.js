import { rollup } from 'rollup';

export const build = async config => {
  // 创建 bundle
  const bundle = await rollup(config);

  // 使用配置中的输出选项生成代码
  await bundle.write(config.output);
};
